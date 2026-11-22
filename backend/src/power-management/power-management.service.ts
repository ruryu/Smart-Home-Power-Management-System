import { Inject, Injectable } from '@nestjs/common';
import { AppliancesRepository } from '../appliances/appliances.repository.js';
import type { Appliance } from '../appliances/appliances.js';
import { conflict, notFound } from '../common/api-error.js';
import { DATABASE, type Db } from '../database/database.module.js';
import { DecisionsRepository } from '../decisions/decisions.repository.js';
import { HomeRepository } from '../home/home.repository.js';
import { evaluate, isComfortActive, type EvaluationContext } from './rules/evaluate.js';
import { totalPower } from './rules/power.js';
import { priorityShortfall } from './rules/priority.js';

// 用電超過額定用電的幾倍算故障
const FAULT_RATIO = 1.5;

// 所有會改變用電的操作都經過這裡：先改使用者的要求，再重新計算每台裝置的狀態
@Injectable()
export class PowerManagementService {
    constructor(
        @Inject(DATABASE) private readonly db: Db,
        private readonly appliances: AppliancesRepository,
        private readonly home: HomeRepository,
        private readonly decisions: DecisionsRepository,
    ) {}

    setPower(id: number, on: boolean): void {
        const appliance = this.findOrThrow(id);

        if (on) {
            if (appliance.state === 'faulted') {
                throw conflict('APPLIANCE_FAULTED', '裝置故障中，要先到測試介面修復', { applianceId: id });
            }
            if (appliance.requestedOn) return;
            this.rejectIfUnresolvedOverload(appliance);
        } else if (!appliance.requestedOn) {
            return;
        }

        this.db.transaction(() => {
            this.appliances.setRequestedOn(id, on);
            this.reevaluate();
        })();
    }

    setPriority(id: number, enabled: boolean): void {
        const appliance = this.findOrThrow(id);

        if (!enabled) {
            if (appliance.priorityOrder === null) return;
            this.db.transaction(() => {
                this.appliances.setPriorityOrder(id, null);
                this.decisions.record({
                    rule: 'B4',
                    applianceId: id,
                    action: 'priority-cancel',
                    reason: `使用者取消 ${appliance.name} 的優先`,
                });
                this.reevaluate();
            })();
            return;
        }

        if (appliance.priorityOrder !== null) return;
        if (appliance.state === 'faulted') {
            throw conflict('APPLIANCE_FAULTED', '裝置故障中，要先到測試介面修復', { applianceId: id });
        }

        const context = this.context();
        const { powerLimit } = context;
        const shortfall = priorityShortfall(this.appliances.findAll(), id, powerLimit, isComfortActive(context));
        if (shortfall > 0) {
            this.decisions.record({
                rule: 'B4',
                applianceId: id,
                action: 'priority-reject',
                reason: `指定 ${appliance.name} 為優先需要 ${powerLimit + shortfall}W，超過上限 ${powerLimit}W，不足 ${shortfall}W`,
            });
            throw conflict('INSUFFICIENT_POWER', `指定為優先後一定會超過上限，不足 ${shortfall}W`, { shortfall });
        }

        this.db.transaction(() => {
            this.appliances.setPriorityOrder(id, this.appliances.nextPriorityOrder());
            this.decisions.record({
                rule: 'B4',
                applianceId: id,
                action: 'priority-accept',
                reason: `接受 ${appliance.name} 的優先要求`,
            });
            this.reevaluate();
        })();
    }

    // 故障處理：模擬讀到的用電超過額定用電的 150% 就隔離
    reportUsage(id: number, power: number): void {
        const appliance = this.findOrThrow(id);
        if (appliance.state === 'faulted' || power <= appliance.ratedPower * FAULT_RATIO) return;

        this.db.transaction(() => {
            this.appliances.markFaulted(id, '用電異常，已停止運作，請至測試介面修復');
            this.decisions.record({
                rule: 'B5',
                applianceId: id,
                action: 'fault',
                reason: `${appliance.name} 用電 ${power}W 超過額定用電 ${appliance.ratedPower}W 的 150%，已停止運作`,
            });
            this.reevaluate();
        })();
    }

    repair(id: number): void {
        const appliance = this.findOrThrow(id);
        if (appliance.state !== 'faulted') {
            throw conflict('APPLIANCE_NOT_FAULTED', '這個裝置沒有故障', { applianceId: id });
        }

        this.db.transaction(() => {
            this.appliances.markRepaired(id);
            this.decisions.record({
                rule: 'B5',
                applianceId: id,
                action: 'repair',
                reason: `${appliance.name} 已修復，可以重新開啟`,
            });
            this.reevaluate();
        })();
    }

    deleteAppliance(id: number): void {
        this.findOrThrow(id);
        this.db.transaction(() => {
            this.appliances.delete(id);
            this.reevaluate();
        })();
    }

    // 重新計算所有裝置的狀態，並記錄系統做的決定。
    // allowRevoke：室溫、用電上限改變時才允許撤銷優先
    reevaluate(allowRevoke = false): void {
        const result = evaluate(this.appliances.findAll(), { ...this.context(), allowRevoke });
        this.appliances.saveStates(result.appliances);
        this.decisions.recordAll(result.decisions);
    }

    private context(): EvaluationContext {
        const home = this.home.get();
        return {
            powerLimit: home.powerLimit,
            indoorTemperature: home.indoorTemperature,
            comfortThreshold: home.comfortThreshold,
        };
    }

    private findOrThrow(id: number): Appliance {
        const appliance = this.appliances.findById(id);
        if (!appliance) {
            throw notFound('APPLIANCE_NOT_FOUND', '找不到這個裝置', { applianceId: id });
        }
        return appliance;
    }

    // 已經是無法解決的超標時，拒絕會增加用電的要求
    private rejectIfUnresolvedOverload(appliance: Appliance) {
        const { powerLimit } = this.home.get();
        const overload = totalPower(this.appliances.findAll()) - powerLimit;
        if (overload <= 0) return;

        this.decisions.record({
            rule: 'B1',
            applianceId: appliance.id,
            action: 'reject',
            reason: `目前用電超過上限 ${overload}W 且已無法調整，拒絕開啟 ${appliance.name}`,
        });
        throw conflict('UNRESOLVED_OVERLOAD', '目前用電已超過上限且無法再調整，暫時不能開啟裝置', { overload });
    }
}
