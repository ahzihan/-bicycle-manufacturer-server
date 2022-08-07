const express = require( 'express' );
const { MongoClient, ServerApiVersion, ObjectId } = require( 'mongodb' );
const cors = require( 'cors' );
const jwt = require( 'jsonwebtoken' );
require( 'dotenv' ).config();
const port = process.env.PORT || 5000;
const app = express();

app.use( express.json() );
app.use( cors() );



const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.xlfxim0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 } );

const verifyJWT = ( req, res, next ) => {
    const authHeader = req.headers.authorization;
    if ( !authHeader ) {
        return res.status( 401 ).send( { message: 'UnAuthorized Access' } );
    }
    const token = authHeader.split( ' ' )[ 1 ];
    jwt.verify( token, process.env.ACCESS_TOKEN_SECRET, function ( err, decoded ) {
        if ( err ) {
            return res.status( 403 ).send( { message: 'Forbidden Access' } );
        }
        req.decoded = decoded;
        next();
    } );
};

async function run() {
    try {
        await client.connect();
        const userCollection = client.db( "bicycle-manufacture" ).collection( "users" );
        const productCollection = client.db( "bicycle-manufacture" ).collection( "products" );
        const orderCollection = client.db( "bicycle-manufacture" ).collection( "orders" );

        const verifyAdmin = async ( req, res, next ) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne( { email: requester } );
            if ( requesterAccount.role === 'admin' ) {
                next();
            }
            else {
                res.status( 403 ).send( { message: 'Forbidden access' } );
            }
        };

        app.put( '/user/:email', async ( req, res ) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne( filter, updateDoc, options );
            const token = jwt.sign( { email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' } );
            res.send( { result, token } );
        } );

        app.get( '/user', verifyJWT, async ( req, res ) => {
            const users = await userCollection.find().toArray();
            res.send( users );
        } );

        app.put( '/user/admin/:email', verifyJWT, verifyAdmin, async ( req, res ) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne( filter, updateDoc );
            return res.send( result );
        } );

        app.get( '/admin/:email', async ( req, res ) => {
            const email = req.params.email;
            const user = await userCollection.findOne( { email: email } );
            const isAdmin = user.role === 'admin';
            res.send( { admin: isAdmin } );
        } );

        app.get( '/product', verifyJWT, async ( req, res ) => {
            const products = await productCollection.find().toArray();
            res.send( products );

        } );

        app.post( '/product', verifyJWT, verifyAdmin, async ( req, res ) => {
            const product = req.body;
            const result = await productCollection.insertOne( product );
            res.send( result );
        } );

        app.delete( '/product/:id', verifyJWT, verifyAdmin, async ( req, res ) => {
            const id = req.params.id;
            const filter = { _id: ObjectId( id ) };
            const result = await productCollection.deleteOne( filter );
            res.send( result );
        } );

        app.post( '/order', async ( req, res ) => {
            const info = req.body;
            // const query = { product: info.product};
            // const exists = await borderCollection.findOne( query );
            // if ( exists ) {
            //     return res.send( { success: false, info: exists } );
            // }
            const result = await orderCollection.insertOne( info );
            return res.send( { success: true, result } );
        } );

    }
    finally {

    }
}
run().catch( console.dir );

app.get( '/', ( req, res ) => {
    res.send( "Welcome to Server" );
} );

app.listen( port, () => {
    console.log( 'DB is running port: ', port );
} );