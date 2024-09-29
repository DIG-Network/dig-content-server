import superagent from 'superagent';

/**
 * Executes a Chialisp program by calling the CLVM execution container.
 *
 * @param {string} clsp - The Chialisp program string.
 * @param {string[]} params - An array of parameters to pass to the Chialisp program.
 * @returns {Promise<string>} - The result from executing the Chialisp program.
 */
export async function executeChialisp(clsp: string, params: string[]): Promise<string> {
    try {
        // The CLVM container is accessible on the Docker network with the service name 'clvm' and port '4163'
        const response = await superagent
            .post('http://clvm:4163/run-chialisp')
            .set('Content-Type', 'application/json')
            .send({
                clsp: clsp,
                params: params
            });

        // Return the result from the CLVM container
        return response.body.result;
    } catch (error: any) {
        console.error('Error calling CLVM container:', error.message);
        throw new Error('Failed to execute Chialisp program');
    }
}