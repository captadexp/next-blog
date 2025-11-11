import {dbProvider} from "./db";

export default function () {
    return {
        db: dbProvider,
        ui: {
            branding: {
                name: "Amazing 1oh1",
                description: "The best directory website"
            }
        }
    }
}
