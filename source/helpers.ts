import { execSync } from "child_process";
import * as path from 'path'

/**
 * Tries to guess the name from the package.json
 */
export function guessAppName(): string {

    const name = 'Webpack App';
    const root = execSync('npm prefix');

    return require(
        path.resolve(root.toString('utf8').trim(), 'package.json')
    ).name || name

    // let packageJson = path.resolve(compilerWorkingDirectory, 'package.json');
    //
    // if (!fs.existsSync(packageJson)) {
    //
    //     packageJson = path.resolve(compilerWorkingDirectory, '../package.json');
    //
    //     if (!fs.existsSync(packageJson)) {
    //         return 'Webpack App';
    //     }
    //
    // }
    //
    // return JSON.parse(fs.readFileSync(packageJson).toString()).name;

}
