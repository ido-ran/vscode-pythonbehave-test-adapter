import * as vscode from 'vscode';

function convertToLinuxPath (path: string): string {
    const linuxPath = path.replace(/\\/g, '/');
    return linuxPath;
}

export class PythonExtensionConfiguration {

    constructor(private readonly workspace: vscode.WorkspaceFolder) {}
    
    async getPythonExecutable(): Promise<string | undefined> {
        const workspaceUri: vscode.Uri = this.workspace.uri;
        const extension = vscode.extensions.getExtension('ms-python.python')!;
        const usingNewInterpreterStorage = extension.packageJSON.featureFlags.usingNewInterpreterStorage;
    
        if (!usingNewInterpreterStorage) {
            return undefined;
        }
    
        if (!extension.isActive) {
            await extension.activate();
        }
        await extension.exports.ready;
        const pythonPath = extension.exports.settings.getExecutionDetails(workspaceUri).execCommand[0];
        return pythonPath;
    }

    getWorkspaceFSPath(): string {
        return convertToLinuxPath(this.workspace.uri.fsPath);
    }
        
}
