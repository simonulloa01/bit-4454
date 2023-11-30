const { app } = require('@azure/functions');

app.http('PostPeerEval', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        context.log('Processing a post peer eval request.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text())
        const sess = body.session_id


        if (!email) {
            return { status: 400, body: email };
        }

        // Setup your SQL connection
        const db = mysql.createConnection({
            host: 'bitsem.mysql.database.azure.com',
            user: 'clay',
            password: 'Bit44542023',
            database: 'main',
            port: 3306,
            ssl: true
        });

        db.connect();



    }
});
