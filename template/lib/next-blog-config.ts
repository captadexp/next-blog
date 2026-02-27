import {dbProvider} from "./db";

export default function () {
    return {
        db: dbProvider,
        ui: {
            branding: {
                name: process.env.NAME,
                description: process.env.DESCRIPTION,
            }
        }
    }
}
