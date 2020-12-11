var express = require('express');
var path = require('path');
var exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
var transporter = require('./mail');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES =['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  //console.log(JSON.parse(content))
  authorize(JSON.parse(content), listFiles);
  authorize(JSON.parse(content), downloadFiles)
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    // callback(oAuth2Client);
  });
}
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        callback(oAuth2Client);
      });
    });
  }
app.use(express.static(path.join(__dirname,'public')));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.post('/login',async(req, res)=>{
    console.log(req.body);

    const response = await axios.get('https://health-care-system-7e99a.firebaseio.com/userInfo.json');

    for(var key in response.data)
    {
        var user = response.data[key];
        if(user.email == req.body.email)
        {
            if(user.password == req.body.password)
            {
                console.log('Logged in');

                const response2 = await axios.get('https://health-care-system-7e99a.firebaseio.com/medHistory.json');

                for(var key in response2.data)
                {
                    var his = response2.data[key];
                    if(his.email == req.body.email)
                    {
                        res.render('dashboard',{
                            email : req.body.email,
                            bGroup : his.bGroup,
                            medHistory : his.medHistory,
                            allergy : his.allergy,
                            found : true,
                            arr : []
                        });
                        return;
                    }
                }

                res.render('dashboard',{
                    email : req.body.email,
                    bGroup : '',
                    medHistory : '',
                    allergy : '',
                    found : false,
                    arr : []
                });
            }
            else{
                console.log('Invalid Password');
            }
        }
        
    }


})

app.post('/register',async(req, res)=>{
    console.log(req.body);
    if(req.body.fname === null || req.body.fname.trim().length === 0)
    {
        console.log('Name should not be empty');
        return;
    }
    if(req.body.password === null || req.body.password.trim().length === 0)
    {
        console.log('Password should not be empty');
        return;
    }
    if(req.body.age > 100)
    {
        console.log('Cant be 100 or greater');
        return;
    }
    if(req.body.contact < 10 || req.body.conact > 10)
    {
        console.log('Contact can be less or greater than 10');
        return;
    }
    if(req.body.address === null || req.body.address.trim().length === 0)
    {
        console.log('Address should not be empty');
        return;
    }
    if(req.body.medhistory === null || req.body.medhistory.trim().length === 0)
    {
        console.log('Medical history should not be empty');
        return;
    }
    if(req.body.allergy === null || req.body.allergy.trim().length === 0)
    {
        console.log('Allergy should not be empty');
        return;
    }
    const obj = {
        'name': req.body.fname,
        'email' : req.body.email,
        'password': req.body.password,
        'age': req.body.age,
        'date of birth': req.body.dob,
        'contact': req.body.contact,
        'address': req.body.address,
        'medical history': req.body.medhistory,
        'allergies': req.body.allergy,
    }
    const response = await axios.post('https://health-care-system-7e99a.firebaseio.com/userInfo.json', obj);
    console.log(response);
    res.render('login');
})

generateOtp = () => {
    var digits = '0123456789'; 
    let OTP = ''; 
    for (let i = 0; i < 4; i++ ) { 
        OTP += digits[Math.floor(Math.random() * 10)]; 
    } 
    return OTP; 
}

app.post('/passwordreset',(req, res)=>{
    console.log(req.body);
    var otp = generateOtp();
    var mail = {
        from : 'healthcaresystem2020@gmail.com',
        to : req.body.email,
        subject : 'Reset Password',
        text : `Enter the OTP to reset your password.\nYour OTP is ${otp}`
    }

    transporter.sendMail(mail,async (err,info) =>{
        console.log('Mail sent');

        const obj = {
            'email' : req.body.email,
            'otp' : otp
        };

        const response = await axios.post('https://health-care-system-7e99a.firebaseio.com/otp.json', obj);
        console.log(response);
        res.render('otp',{
            email : req.body.email,
            error : ''
        })
    })
})

app.post('/verifyOtp',async(req,res) => {
    console.log(req.body);
    const response = await axios.get('https://health-care-system-7e99a.firebaseio.com/otp.json');

    for(var key in  response.data)
    {
        var user = response.data[key];
        if(user.email == req.body.email)
        {
            if(user.otp == req.body.otp)
            {
                console.log('OTP Authentication successful');
                res.render('updatePassword',{
                    email : req.body.email,
                    error : ''
                })
                return;
            }
            else{
                //console.log('Otp Authentication unseccessful');
            }
        }
    }
    res.render('otp',{
        email : req.body.email,
        error : 'Invalid OTP.'
    })
})

app.post('/updatePassword', async(req,res) => {
    console.log('Inside upPas');
    const response = await axios.get('https://health-care-system-7e99a.firebaseio.com/userInfo.json');
    console.log(response.data);
    console.log(req.body);
    for(var key in response.data)
    {
        var user = response.data[key];
        if(user.email === req.body.email)
        {
            const obj = {
                'password' : req.body.newpassword
            }

            const resp = await axios.patch(`https://health-care-system-7e99a.firebaseio.com/userInfo/${key}.json`,obj);

            console.log(resp.data);
            console.log('password reset successful');
            res.render('login',{
                'email' : email
            })
        }
        
    }
    res.render('updatePassword',{
        email : req.body.email,
        error : 'Invalid email '
    });
})

app.post('/updatehistory',async(req,res) => {
    console.log(req.body);

    if(req.body.found == 'false')
    {
        const obj = {
            'email' : req.body.email,
            'bGroup' : req.body.bloodgroup,
            'medHistory' : req.body.medhistory,
            'allergy' : req.body.allergy
        }

        const resp2 = await axios.post(`https://health-care-system-7e99a.firebaseio.com/medHistory.json`,obj);

        res.render('dashboard',{
            email : req.body.email,
            bGroup : req.body.bloodgroup,
            medHistory : req.body.medhistory,
            allergy : req.body.allergy,
            found : true,
            arr : [],
        })

    }
    else{

        var k =0;
        const resp = await axios.get(`https://health-care-system-7e99a.firebaseio.com/medHistory.json`);

        for(var key in resp.data)
        {
            if(req.body.email == resp.data[key].email)
                {
                    k = key;
                    break;
                }
        }

        const obj = {
            'email' : req.body.email,
            'bGroup' : req.body.bloodgroup,
            'medHistory' : req.body.medhistory,
            'allergy' : req.body.allergy
        }

        const resp2 = await axios.patch(`https://health-care-system-7e99a.firebaseio.com/medHistory/${k}.json`,obj);

        res.render('dashboard',{
            email : req.body.email,
            bGroup : req.body.bloodgroup,
            medHistory : req.body.medhistory,
            allergy : req.body.allergy,
            found : true,
            arr : []
        })
    }
})

app.get('/getRecords',listFiles)

function listFiles(req,res,auth) {
    console.log('Inside list')
    const drive = google.drive({version: 'v3', auth});
    drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const files = res.data.files;
      const arr = [];
      if (files.length) {
        console.log('Files:');
        files.map((file) => {
            if(file.name.startsWith(req.body.email))
            {
                arr.push({
                    'name' : file.name,
                    'id' : file.id
                })
            }
            
        });
        res.render('dashboard',{
            email : req.body.email,
            bGroup : req.body.bloodgroup,
            medHistory : req.body.medhistory,
            allergy : req.body.allergy,
            found : true,
            arr : arr
        })
      } else {
        console.log('No files found.');
      }
    });
  }
  function downloadFiles(auth){ 
    const drive = google.drive({version: 'v3', auth});
    var fileId = '1qYQ8qvIpHRvH9yJr3Tf4WFq4ZTQapNwb';
    var dest = fs.createWriteStream('./report.pdf');
    drive.files.get({fileId: fileId, alt: "media"}, {responseType: "stream"},
        function(err, res){
           res.data
           .on("end", () => {
              console.log('Done');
           })
           .on("error", err => {
              console.log("Error", err);
           })
           .pipe(dest);
        }
    )
  }

  app.post('/logout',(req,res) => {
    res.render('login')
  })
  
app.listen(process.env.PORT || 3000,()=>{
    
    console.log("Server Started");
    
}

)
