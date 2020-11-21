import { spawn } from "child_process";
import * as vscode from 'vscode';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { PythonExtensionConfiguration } from './python-extension-configuration';
import { chomp, chunksToLinesAsync } from '@rauschma/stringio';

function executeProcess(command: string, cwd: string, args: string[]): Promise<number> {
    const child = spawn(
        command, args,
        {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe']
        },
    );

    return new Promise<number>((resolve, reject) => {
		const stderrBuffer: Buffer[] = [];
		
		const re = /[\r\n]/

        child.stdout!.on('data', (chunk) => {
			const chunkstr = chunk.toString();
			for (const line of chunkstr.split(re)) {
				if (line) {
					console.log("----- start ------ ");
					console.log(line);
					console.log("----- end ------ ");
				}
			}
		});
        child.stderr!.on('data', (chunk) => {
			console.error(chunk);
		});

        child.once('exit', exitCode => {
            
            if(exitCode === null && child.killed){
                reject({exitCode: exitCode, message: `process cancelled`});
            }

            // const output = iconv.decode(Buffer.concat(stdoutBuffer), 'utf8');
            resolve(55);
        });

        child.once('error', error => {
            reject(`Fail to execute process: ${error}`);
        });

    });
}


export async function runTests(
	tests: string[],
	rootSuite: TestSuiteInfo,
	config: PythonExtensionConfiguration,
	log: Log,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {

    const pythonExec = await config.getPythonExecutable();

	if (!pythonExec) {
		log.error("Fail to get python executable");
		return;
	}
	
	const behaveArgs = [
		"-u",
        "-m", "behave", 
        "--format", "plain", 
        "--no-summary"
	];

	const rootPath = config.getWorkspaceFSPath();

	executeProcess(pythonExec, rootPath, behaveArgs);
	
    // const child = spawn(
    //     pythonExec, behaveArgs,
    //     {
	// 		cwd: rootPath,
	// 		stdio: ['ignore', 'pipe', process.stderr]
    //     },
	// );

	// if (!child.stdout) {
	// 	log.error("spawn child has null stdout, stopping");
	// 	return;
	// }

	// for await (const line of chunksToLinesAsync(child.stdout)) {
	// 	console.log('LINE: ' + chomp(line))
	//   }

	// for (const suiteOrTestId of tests) {
	// 	const node = findNode(rootSuite, suiteOrTestId);
	// 	if (node) {
	// 		await runNode(node, testStatesEmitter);
	// 	}
	// }
}

function findNode(searchNode: TestSuiteInfo | TestInfo, id: string): TestSuiteInfo | TestInfo | undefined {
	if (searchNode.id === id) {
		return searchNode;
	} else if (searchNode.type === 'suite') {
		for (const child of searchNode.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return undefined;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runNode(
	node: TestSuiteInfo | TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {

	if (node.type === 'suite') {

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'running' });

		for (const child of node.children) {
			await runNode(child, testStatesEmitter);
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'completed' });

	} else { // node.type === 'test'

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'running' });

		await sleep(1400);

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'passed' });

	}
}
