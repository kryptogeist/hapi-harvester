'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const Joi = require('joi')
const Hapi = require('hapi')

let server, buildServer, destroyServer, hh;

const schema = {
    type: 'brands',
    attributes: {
        code: Joi.string().min(2).max(10),
        description: Joi.string(),
        year: Joi.number()
    }
};

const data = {
    attributes: {
        code: 'MF',
        description: 'Massey Furgeson',
        year: 2007
    }
};


//TODO just done the validation, actual includes is remaining
describe('Inclusion', function() {
    
    beforeEach(function(done) {
        buildServer(() => {
            let promises = [];
        
            _.times(10, () => {
                promises.push(server.injectThen({method: 'post', url: '/brands', payload: {data}}))
            })
            
            return Promise.all(promises)
            .then(() => {
                done()
            })
        })
    })
    
    afterEach(function(done) {
        destroyServer(done)
    })
    
    it('Will be able to GET all from /brands with a inclusion', function() {
        return server.injectThen({method: 'get', url: '/brands?include=code'})
        .then((res) => {
            res.result.data.forEach((result) => {
                let dataToCompare = _.pick(data.attributes, 'code')
                expect(result.id).to.match(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/)
                expect(result.attributes).to.deep.equal(dataToCompare)
            })
        })
    })
    
    it('Will be able to GET all from /brands with multiple inclusions', function() {
        return server.injectThen({method: 'get', url: '/brands?include=code,description'})
        .then((res) => {
            res.result.data.forEach((result) => {
                let dataToCompare = _.pick(data.attributes, ['code', 'description'])
                expect(result.id).to.match(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/)
                expect(result.attributes).to.deep.equal(dataToCompare)
            })
        })
    })
    
    it('Won\'t be able to GET all from /brands with an inclusion not available in attributes', function() {
        return server.injectThen({method: 'get', url: '/brands?include=code,foo'})
        .then((res) => {
            expect(res.statusCode).to.equal(400)
        })
    })
})

buildServer = function(done) {
    const Hapi = require('hapi')
    const plugin = require('../')
    const adapter = plugin.getAdapter('mongodb')
    server = new Hapi.Server()
    server.connection({port : 9100})
    server.register([
        {register: require('../'), options: {adapter: adapter({mongodbUrl: 'mongodb://localhost/test'})}},
        {register: require('inject-then')}
    ], () => {
        hh = server.plugins.harvester;
        server.start(() => {
            ['get', 'getById', 'post', 'patch', 'delete'].forEach(function(verb) {
                server.route(hh.routes[verb](schema))
            })
            done()  
        })  
    })
}

destroyServer = function(done) {
    utils.removeFromDB(server, 'brands')
    .then((res) => {
        server.stop(done)  
    })
}