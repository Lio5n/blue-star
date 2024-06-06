export async function request(action: string, params: any = {}): Promise<any> {
    // console.log('Sending request to AnkiConnect:', { action, params });

    const response = await fetch('http://localhost:8765', {
        method: 'POST',
        body: JSON.stringify({
            action: action,
            version: 6,
            params: params
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    // console.log('Received response from AnkiConnect:', data);

    if (data.error) {
        throw new Error(data.error);
    }
    return data.result;
}
