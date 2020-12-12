import { spawn } from "child_process";
import * as vscode from 'vscode';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { PythonExtensionConfiguration } from './python-extension-configuration';

function executeProcess(command: string, cwd: string, args: string[], testOutputChannel: vscode.OutputChannel): Promise<number> {
    const child = spawn(
        command, args,
        {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe']
        },
    );

    return new Promise<number>((resolve, reject) => {
		// const re = /[\r\n]/

        child.stdout!.on('data', (chunk) => {
			const chunkstr = chunk.toString();
			testOutputChannel.append(chunkstr);
			// for (const line of chunkstr.split(re)) {
			// 	if (line) {
			// 		console.log("----- start ------ ");
			// 		console.log(line);
			// 		console.log("----- end ------ ");
			// 	}
			// }
		});
        child.stderr!.on('data', (chunk) => {
			testOutputChannel.append(chunk.toString());
		});

        child.once('exit', exitCode => {
            
            if(exitCode === null && child.killed){
                reject({exitCode: exitCode, message: `process cancelled`});
            }

			// const output = iconv.decode(Buffer.concat(stdoutBuffer), 'utf8');
			if (exitCode == null) {
				reject("exitCode is null");
			} else {
				resolve(exitCode);
			}
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
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	testOutputChannel: vscode.OutputChannel,
): Promise<void> {

	testOutputChannel.clear();
	testOutputChannel.show(true);

	for (const suiteOrTestId of tests) {
		const node = findNode(rootSuite, suiteOrTestId);
		if (node) {
			await runNode(node, testStatesEmitter, config, log, testOutputChannel);
		}
	}

}

async function runSingleBehaveTest(
	testNode: TestInfo,
	config: PythonExtensionConfiguration,
	log: Log,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	testOutputChannel: vscode.OutputChannel,
) {
    const pythonExec = await config.getPythonExecutable();

	if (!pythonExec) {
		return log.error("Fail to get python executable");
	}
	
	if (!testNode.file) {
		return log.error(`Cannot run test because testNode.file is not set for ${testNode.id}`);
	}

	if (!testNode.line) {
		return log.error(`Cannot run test because testNode.line is not set for ${testNode.id}`);
	}

	const behaveArgs = [
		"-u",
        "-m", "behave", 
		"--format", "pretty",
		"--no-skipped",
		"--no-summary",
		`${testNode.file}:${testNode.line + 1}`
	];

	const rootPath = config.getWorkspaceFSPath();

	try {
		const exitCode: number = await executeProcess(pythonExec, rootPath, behaveArgs, testOutputChannel);
	
		if (exitCode === 0) {
			testStatesEmitter.fire(<TestEvent>{ type: 'test', test: testNode.id, state: 'passed' });
		} else {
			testStatesEmitter.fire(<TestEvent>{ type: 'test', test: testNode.id, state: 'failed' });
		}
	} catch (err) {
		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: testNode.id, state: 'errored', message: err });
	}
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

async function runNode(
	node: TestSuiteInfo | TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>,
	config: PythonExtensionConfiguration,
	log: Log,
	testOutputChannel: vscode.OutputChannel,
): Promise<void> {

	if (node.type === 'suite') {

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'running' });

		for (const child of node.children) {
			await runNode(child, testStatesEmitter, config, log, testOutputChannel);
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'completed' });

	} else { // node.type === 'test'

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'running' });

		await runSingleBehaveTest(node, config, log, testStatesEmitter, testOutputChannel);
	}
}
