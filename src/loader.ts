import { spawn } from "child_process";
import { TestInfo, TestSuiteInfo } from "vscode-test-adapter-api";
import * as iconv from 'iconv-lite';
import { Log } from 'vscode-test-adapter-util';
import { PythonExtensionConfiguration } from './python-extension-configuration';

interface ProcessResult {
    exitCode: number | null;
    output: string;
}

function executeProcessToEnd(command: string, cwd: string, args: string[]): Promise<ProcessResult> {
    const child = spawn(
        command, args,
        {
            cwd,
        },
    );

    return new Promise<ProcessResult>((resolve, reject) => {
        const stdoutBuffer: Buffer[] = [];
        const stderrBuffer: Buffer[] = [];
        child.stdout!.on('data', chunk => stdoutBuffer.push(chunk));
        child.stderr!.on('data', chunk => stderrBuffer.push(chunk));

        child.once('exit', exitCode => {
            
            if(exitCode === null && child.killed){
                reject({exitCode: exitCode, message: `process cancelled`});
            }

            const output = iconv.decode(Buffer.concat(stdoutBuffer), 'utf8');
            resolve({exitCode, output });
        });

        child.once('error', error => {
            reject(`Fail to execute process: ${error}`);
        });

    });
}

interface BehaveItem {
    type: string;
    keyword: string;
    location: string;
    name: string;
}

interface BehaveFeature extends BehaveItem {
    elements: BehaveScenario[];
}

interface BehaveScenario extends BehaveItem {
    // steps - if we'll ever care about steps
}

function parseLineNo(lineStr: string): number | undefined {
    try {
        const oneBasedLineNo = parseInt(lineStr);
        return oneBasedLineNo - 1;
    } catch {
        return undefined;
    }
}

function convertScenarioToTest(rootPath: string, scenario: BehaveScenario): TestInfo {
    const [filePath, line] = scenario.location.split(":");
    const test = {
        type: 'test' as const,
        id: `${scenario.name}:${scenario.location}`,
        label: scenario.name,
        file: `${rootPath}/${filePath}`,
        line: parseLineNo(line),
    };

    return test;
}

function convertFeatureToTestSuite(rootPath: string, feature: BehaveFeature): TestSuiteInfo {
    const [filePath, line] = feature.location.split(":");
    const featureSuite: TestSuiteInfo = {
        type: 'suite' as const,
        id: `${feature.name}:${feature.location}`,
        label: feature.name,
        file: `${rootPath}/${filePath}`,
        line: parseLineNo(line),
        children: [],
    };

    feature.elements.forEach((scenario: BehaveScenario) => {
        if (scenario.keyword === "Scenario" || scenario.keyword === "Scenario Outline") {
            featureSuite.children.push(convertScenarioToTest(rootPath, scenario));
        } else {
            console.log(`Found unknown scenario ${scenario}`);
        }
    });

    return featureSuite;
}

export async function loadBehaveTests(log: Log, config: PythonExtensionConfiguration): Promise<TestSuiteInfo> {

    const pythonExec = await config.getPythonExecutable();

    if (!pythonExec) {
        log.error("Fail to get python executable");
    }

    const behaveArgs = [
        "-m", "behave", 
        "--dry-run", 
        "--format", "json", 
        "--no-summary"
    ];

    const features: TestSuiteInfo[] = [];

    if (pythonExec) {
        const rootPath = config.getWorkspaceFSPath();
        const jsonOutput = await executeProcessToEnd(pythonExec, rootPath, behaveArgs);

        if (jsonOutput.exitCode === 0) {
            const behaveDesc = JSON.parse(jsonOutput.output);


            behaveDesc.forEach((feature: BehaveFeature) => {
                if (feature.keyword === "Feature") {
                    features.push(convertFeatureToTestSuite(rootPath, feature))
                } else {
                    console.log(`Unknown feature ${feature}`);
                }
            });
        }
    }

    const rootSuite = {
        type: 'suite' as const,
        id: '',
        label: '',
        children: features,
    };

    return rootSuite;
}
