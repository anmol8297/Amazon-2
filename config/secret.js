module.exports = {
    database: 'mongodb://a_nmol:ecommerce@ds059207.mlab.com:59207/ecommerce',
    port:  3000,
    secretkey: '1234567890-0987654321',

    facebook: {
        clientID: process.env.FACEBOOK_ID || '1835822630041219',
        clientSecret: process.env.FACEBOOK_SECRET || 'bc1045ef6be480ca23d13e2701ef0674',
        profileFields: ['emails', 'displayName'],
        callbackURL: 'http://localhost:3000/auth/facebook/callback'
    }
}