import * as vscode from 'vscode';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { Log, TestAdapterRegistrar } from 'vscode-test-adapter-util';
import { PythonBehaveAdapter } from './python-behave-adapter';
import { PythonExtensionConfiguration } from './python-extension-configuration';

export async function activate(context: vscode.ExtensionContext) {

	const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

	// create a simple logger that can be configured with the configuration variables
	// `exampleExplorer.logpanel` and `exampleExplorer.logfile`
	const log = new Log('pyhtonBehave', workspaceFolder, 'Python Behave Explorer Log');
	context.subscriptions.push(log);

	const testOutputChannel = vscode.window.createOutputChannel("Python Behave Test Run");

	// get the Test Explorer extension
	const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
	if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

	if (testExplorerExtension) {

		const testHub = testExplorerExtension.exports;

		const config = new PythonExtensionConfiguration(workspaceFolder);
		// this will register an ExampleTestAdapter for each WorkspaceFolder
		context.subscriptions.push(new TestAdapterRegistrar(
			testHub,
			workspaceFolder => new PythonBehaveAdapter(workspaceFolder, config, log, testOutputChannel),
			log
		));
	}
}
