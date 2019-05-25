require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')

 //Para parsear el body que viene de los forms
const jsonBodyParser = bodyParser.json()
const { Schema } = mongoose

const {env: { PORT, URL }} = process

const userSchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'The name is required'] //Podemos personalizar los errores
    },
    surname: { 
        type: String, 
        required: [true, 'The surname is required']
    },
    age: { 
        type: Number, 
        required: [true, 'The name is required']
    },

    hobbie: String,

    email: { 
        type: String, 
        required: [true, 'The name is required'],
        unique: true
    },
    password: { 
        type: String, 
        required: [true, 'The name is required']
    },
    role:{ 
        type: String, 
        default: 'USER_ROLE',
        enum: { //Con enum puedes indicarle solo los valores posibles que quieres admitir
            values: ['ADMIN_ROLE', 'USER_ROLE'], 
            message: 'no es un role valido'
        }
    },
    status: { 
        type: Boolean, 
        default: true
    },
})

const User = mongoose.model('User', userSchema)

//Conectar con mongoose - mongodb - 27017 puerto por defecto, no hace falta indicarlo
mongoose.connect(URL, { 
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true
    })
    .then(() => {
        const app = express()
        const router = express.Router()

        app.use('/api', router)

        app.get('/user/:id', (req, res) => {
            const { params: { id }} = req

            User.findById(id).select('name surname email').lean()
                .then(user => {
                    if(!user) throw Error('user not found')

                    user.id = user._id
                    delete user._id

                    res.json({ ok: true, user})
                    // res.status(200).json({ ok: true, user})
                })
                .catch(error => {
                    res.status(400).json({ ok: false, error: error.message})
                })
        })

        app.get('/users', (req, res) => {
            const { query: { skip, limit }} = req

            // Using pagination
            User.find()
                .skip(Number(skip)) //el elemento donde comienza a paginar
                .limit(Number(limit)) //los elementos que se deben encontrar
                .then(users => {
                    const count = User.countDocuments() //mirarlo!!!!

                    res.json({ ok: true, users})
                })
                .catch(error => {
                    res.status(400).json({ ok: false, error})
                })
        })
        
        app.post('/user', jsonBodyParser, (req, res) => {

            const { name, surname, age, hobbie, email, password, role } = req.body

            const encryptPass = bcrypt.hashSync(password, 10);

            User.create({name, surname, age, hobbie, email, password: encryptPass, role })
                .then(user => {
                    res.status(201).json({ ok: true, user})
                })
                .catch(error => {
                    res.status(400).json({ ok: false, error})
                })  
        })
        
        app.get('/user/auth', jsonBodyParser, async (req, res) => {
            const { body: { email, password }} = req

            const user = await User.findOne({email})

            if(!user) res.status(400).json({ ok: false, error: 'wrong credentials'})
            
            if(bcrypt.compareSync(password, user.password)) {
                res.json({ ok: true, token: 'tookeeeen'}) //falta devolver el token
            } else res.status(400).json({ ok: false, error: 'wrong credentials'})
        })

        app.put('/user/:id', jsonBodyParser, async (req, res) => {
            const { 
                body: {name, surname, age, hobbie, email, password, role, status }, 
                params: { id }
            } = req

            const user = await User.findById(id)

            if(!user) res.status(400).json({ ok: false, error: 'user not found'})

            const body = {
                name: name || user.name,
                surname: surname || user.surname,
                age: age || user.age,
                hobbie: hobbie || user.hobbie,
                email: email || user.email,
                password: password || user.password,
                role: role || user.role,
                status: (status == null) ? status : user.status
            }

            await User.findByIdAndUpdate(id, body, {new: true})
                .then(user => {
                    res.status(200).json({ ok: true, user})
                })
                .catch(error => {
                    res.status(400).json({ ok: false, error})
                })  
        })
        
        app.delete('/user/:id', (req, res) => {
            const {params: { id }} = req



            User.findByIdAndDelete(id)
                .then(()=> {

                    res.send({ ok: true, message: 'delete user'})
                    // res.status(200).json({ ok: true, user})
                })
                .catch(error => {
                    res.status(400).json({ ok: false, error})
                })
        })
        
        //Para levantar un servidor en el puerto 3000
        app.listen(PORT, () => console.log(`Servidor conectado en puerto ${PORT}`))
    })
    .catch(error => {
        console.log(error.name, error.message)
    })

