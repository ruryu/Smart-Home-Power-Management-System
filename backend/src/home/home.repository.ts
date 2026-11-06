import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Db } from '../database/database.module.js'
import type { HomeState } from "./home-state.js";

type HomeStateRow = {
    power_limit: number;
    indoor_temperature: number;
    comfort_threshold: number;
};

@Injectable()
export class HomeRepository {
    constructor(@Inject(DATABASE) private readonly db: Db) {}

    get(): HomeState {
        const row = this.db
          .prepare(
            `SELECT power_limit, indoor_temperature, comfort_threshold FROM home_state WHERE id = 1`,
          )
          .get() as HomeStateRow;

        return {
            powerLimit: row.power_limit,
            indoorTemperature: row.indoor_temperature,
            comfortThreshold: row.comfort_threshold,
        };
    }
}