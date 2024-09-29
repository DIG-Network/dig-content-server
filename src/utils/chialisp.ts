import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify the exec function to use async/await
const execPromise = promisify(exec);

/**
 * Executes Chialisp code with optional parameters using `run` and `brun` in one command.
 *
 * @param clsp - The Chialisp code to run
 * @param params - Optional parameters for the Chialisp code
 * @returns The result of the CLVM execution
 */
export async function executeChialisp(clsp: string, params?: string[]): Promise<string> {
    if (!clsp) {
        throw new Error('Chialisp code is required');
    }

    // Unescape internal quotes in the Chialisp code
    clsp = clsp.replace(/\\"/g, '"');

    // Log the incoming Chialisp code
    console.log(`Received Chialisp code: ${clsp}`);

    try {
        // Construct the one-liner command using `run` and `brun`
        let clvmArgs = params ? `(${params.join(' ')})` : 'nil'; // Wrap params in parentheses
        if (!params?.length) {
            clvmArgs = 'nil';
        }
        const command = `brun "$(run "${clsp}")" "${clvmArgs}"`;

        console.log(`Executing command: ${command}`);

        // Execute the one-liner `brun "$(run ...)"` command
        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
            console.error(`CLVM execution errors: ${stderr}`);
        }

        // Trim the output of CLVM execution to remove any trailing newlines or spaces
        const trimmedResult = stdout.trim();

        // Log the result
        console.log(`CLVM execution result: ${trimmedResult}`);

        // Return the result of the CLVM execution
        return trimmedResult;
    } catch (err) {
        console.error(`An error occurred: ${err}`);
        throw new Error('An internal error occurred during CLVM execution');
    }
}
