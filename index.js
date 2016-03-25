var express       = require ( 'express' );
var jsondiffpatch = require ( 'jsondiffpatch' );
var fs            = require ( 'fs' );
var bodyParser    = require ( 'body-parser' );

var app = express ();

app.get ( '/', ( req, res ) => {
    return fs.createReadStream ( 'index.html' ).pipe ( res );
} );

app.post ( '/api/jsons', bodyParser.json (), ( req, res, next ) => {
    var left  = req.body.first;
    var right = req.body.second;

    var delta = jsondiffpatch.diff ( left, right );

    var changes = [];
    var diffObj = {
        "diffData" : changes
    };

    function parse ( obj, parentKey ) {

        var keys = Object.keys ( obj );
        if ( obj[ '_t' ] === 'a' ) {
            keys.forEach ( function ( key ) {
                var value = obj[ key ];
                if ( !(key === '_t') ) {
                    var itemKeys = Object.keys ( value );
                    itemKeys.forEach ( function ( _key ) {
                        var _value                   = value[ _key ];
                        var aDiff                    = {};
                        aDiff.change                 = {};
                        aDiff.fieldName              = parentKey;
                        aDiff.change.changeFieldName = _key;
                        buildChange ( aDiff.change, _value );
                        changes.push ( aDiff );
                    } );

                }
            } );

        } else {
            keys.forEach ( function ( key ) {
                var value = obj[ key ];
                if ( value instanceof Array ) {
                    var aDiff                    = {};
                    aDiff.change                 = {};
                    aDiff.change.changeFieldName = aDiff.fieldName = key;
                    buildChange ( aDiff.change, value );
                    changes.push ( aDiff );
                } else if ( typeof value === 'object' ) {
                    parse ( value, key );
                } else {
                    throw new Error ( 'wrong diff object type' );
                }
            } );
        }
    }

    function buildChange ( change, array ) {
        switch ( array.length ) {
            case 1 :
                // insert
                change.newValue   = array[ 0 ];
                change.changeType = 2;
                break;
            case 2 :
                // modify
                change.newValue   = array[ 1 ];
                change.oldValue   = array[ 0 ];
                change.changeType = 3;
                break;
            case 3 :
                // delete
                change.changeType = 1;
                change.oldValue   = array[ 0 ];
                break;
            default :
                throw new Error ( 'wrong array length' );
        }
    }

    parse ( delta );

    return res.json ( diffObj );
} );

app.use ( ( req, res ) => {
    res.status ( 404 ).end ( 'No content.' );
} );

app.use ( ( err, req, res, next ) => {
    console.log ( err.stack );
    return res.status ( 500 ).end ( 'Got error.' );
} );

app.listen ( 3000 );