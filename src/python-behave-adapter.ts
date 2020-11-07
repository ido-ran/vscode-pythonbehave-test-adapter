import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { runFakeTests } from './fakeTests';
import { PythonExtensionConfiguration } from './python-extension-configuration';
import { loadBehaveTests } from './loader';

/**
 * Python Behave - Test Explorer - Adapter.
 */
export class PythonBehaveAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<void>();

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly config: PythonExtensionConfiguration,
		private readonly log: Log
	) {

		this.log.info('Initializing example adapter');

		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);

		this.registerActions();

		console.log(this.config);
	}

	private registerActions() {
        this.disposables.push(vscode.workspace.onDidChangeConfiguration(async configurationChange => {
            const sectionsToReload = [
                'python.pythonPath',
                'python.envFile',
                'python.testing.cwd',
                'python.testing.unittestEnabled',
                'python.testing.unittestArgs',
                'python.testing.pytestEnabled',
                'python.testing.pytestPath',
                'python.testing.pytestArgs',
                'pythonTestExplorer.testFramework'
            ];

            const needsReload = sectionsToReload.some(
                section => configurationChange.affectsConfiguration(section, this.workspace.uri));
            if (needsReload) {
                this.log.info('Configuration changed, reloading tests');
                this.load();
            }
		}));
	}

	async load(): Promise<void> {

		this.log.info('Loading behave tests');

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

		const loadedTests = await loadBehaveTests(this.log, this.workspace.uri);

		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: loadedTests });

	}

	async run(tests: string[]): Promise<void> {

		this.log.info(`Running example tests ${JSON.stringify(tests)}`);

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

		// in a "real" TestAdapter this would start a test run in a child process
		await runFakeTests(tests, this.testStatesEmitter);

		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });

	}

/*	implement this method if your TestAdapter supports debugging tests
	async debug(tests: string[]): Promise<void> {
		// start a test run in a child process and attach the debugger to it...
	}
*/

	cancel(): void {
		// in a "real" TestAdapter this would kill the child process for the current test run (if there is any)
		throw new Error("Method not implemented.");
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}