'use strict'
const chaiAsPromised = require('chai-as-promised')
const chai = require('chai')
const expect = chai.expect
const mongotest = require('./mongotest')
const jimbo = require('jimbo')
const requestPasswordChangeByEmail = require('../../app/methods/request-password-change-by-email')
const modelsPlugin = require('../../models')
const helpers = require('./helpers')
const plugiator = require('plugiator')

chai.use(chaiAsPromised)

const MONGO_URI = 'mongodb://localhost/sitegate-user-tests'

let fakeUser = {
  username: 'sherlock',
  email: 'sherlock@holmes.uk',
  passwod: '123456',
  provider: 'local',
  displayName: 'Sherlock Holmes',
  emailVerified: false,
}

let fakeUserPlugin = helpers.userCreator(fakeUser)

describe('requestPasswordChangeByEmail', function() {
  beforeEach(mongotest.prepareDb(MONGO_URI));
  beforeEach(function(next) {
    this._server = new jimbo.Server()

    this._server.register([
      {
        register: modelsPlugin,
        options: {
          mongoURI: MONGO_URI,
        },
      },
    ], err => next(err))
  })
  afterEach(mongotest.disconnect());

  it('should throw error if no user with the passed email exists', function(done) {
    let result = this._server
      .register([
        {
          register: requestPasswordChangeByEmail,
        },
      ])
      .then(() => this._server.methods
        .requestPasswordChangeByEmail({
          email: 'not-exists@gmail.com',
        }))

    expect(result).to.be.rejectedWith(Error).notify(done)
  })

  it('should send email if account exists', function() {
    return this._server
      .register([
        {
          register: helpers.userCreator(fakeUser),
        },
        {
          register: plugiator.create('jimbo-client', (server, opts) => {
            server.expose('mailer', {
              send(params) {
                expect(params.locals.token).to.exist
                return Promise.resolve()
              },
            })
          }),
        },
        {
          register: requestPasswordChangeByEmail,
        },
      ])
      .then(() => this._server.methods.requestPasswordChangeByEmail({
        email: this._server.fakeUser.email,
      }))
  })
})
