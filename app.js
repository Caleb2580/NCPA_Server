const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const exp = require('constants');
const fs = require('fs-extra');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_KEY);

// BCRYPT
const bcrypt = require('bcrypt');
const { connect } = require('http2');
const { profile } = require('console');
const saltRounds = 10;

const JWT_SECRET = process.env.JWT_SECRET;

async function hashPassword(pwd) {
    return (await bcrypt.hash(pwd, saltRounds));
}
async function comparePassword(pwd, enc) {
    return bcrypt.compare(pwd, enc);
}


// hashPassword('Caleb').then(async(r) => {
//     console.log(r);
//     console.log(await comparePassword('Caleb', r))
// })

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: process.env.MYSQL_LOGIN,
    database: 'NCPA',
    multipleStatements: true
}).promise();

// Reading files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({storage: storage})

const app = express();
app.use(cors());

const port = 3000;

const team_types = [
    'Mens Singles',
    'Womens Singles',
    'Mens Doubles',
    'Womens Doubles',
    'Mixed Doubles',
]

app.use(express.static(path.join(__dirname, 'public', 'static')));
app.use(express.static(path.join(__dirname, 'public', 'static', 'styles')));
app.use(express.static(path.join(__dirname, 'public', 'static', 'scripts')));
app.use(express.static(path.join(__dirname, 'public', 'static', 'images')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

function authenticate(req, res, next) {
    try {
        const token = req.cookies.jwtToken;

        if (!token) {
            if (req.method === 'GET') {
                return res.redirect('/login');
            } else {
                return res.send({'success': 'false', 'error': 'authentication failed'});
            }
        }

        jwt.verify(token, JWT_SECRET, async(err, user) => {
            let permission = await getPermission(user.profile_id);
            if (err || permission != 5) {
                if (req.method === 'GET') {
                    return res.redirect('/login');
                } else {
                    return res.send({'success': 'false', 'error': 'authentication failed'});
                }
            }
            next()
        })
    } catch (error) {
        if (req.method === 'GET') {
            return res.redirect('/login');
        } else {
            return res.send({'success': 'false', 'error': 'authentication failed'});
        }
    }
}

// updateCollegeRankings();

// let base_url = 'http://localhost:3000';
let base_url = 'https://api.ncpaofficial.com'

// Routes


// Public

app.get('/', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'home.html'))
})

app.get('/players', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'players.html'))
})

app.get('/colleges', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'colleges.html'))
})

app.get('/ss', authenticate, async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'singles-simulator.html'));
});


// PROFILE
app.get('/login', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'login.html'))
});

app.post('/login', async(req, res) => {
    try {
        if ('password' in req.body && 'email' in req.body) {
            let pf = (await pool.query(`SELECT * FROM Profile where email="${req.body.email}"`))[0];
            if (pf.length === 0) {
                return res.send({'success': false, 'error': 'We cannot find an account associated with that email address'});
            } else {
                pf = pf[0];
                if ((await comparePassword(req.body.password, pf.pass)) === false) {
                    return res.send({'success': false, 'error': 'Wrong password'});
                } else {
                    pf = {'role': 'user', 'profile_id': pf.profile_id};
                    const token = jwt.sign(pf, JWT_SECRET, {expiresIn: '24h'});
                    res.cookie('jwtToken', token, {httpOnly: true, maxAge: 24*60*60*1000});
                    res.send({'success': true});
                }
            }
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
    // if ('password' in req.body && 'email' in req.body) {
    //     const token = jwt.sign({'role': 'user'}, JWT_SECRET, {expiresIn: '1h' });
    //     res.cookie('jwtToken', token, {httpOnly: true, maxAge: 3600000});
    //     res.send({'success': true});
    // } else {
    //     res.send({'success': false});
    // }
});

app.get('/signout', async(req, res) => {
    try {
        res.cookie('jwtToken', '', {httpOnly: true, expires: new Date(0)});
        res.send({'success': true});
    } catch (error) {
        res.send({'success': false});
    }
});

app.get('/register', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'register.html'))
});

function capitalizeFirstLetter(string) {
    if (!string) {
        return '';
    }
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

app.post('/register', async(req, res) => {
    try {
        let {fname, lname, email, password, phone_number, month, day, year, connect_key} = req.body;
        let gen = req.body.gender;

        let err = null;

        if (fname.length == 0) {
            err = 'Please enter a valid first name';
        } else if (lname.length == 0) {
            err = 'Please enter a valid last name';
        } else if (email.length == 0) {
            err = 'Please enter a valid email';
        } else if (!email.includes('@')) {
            err = 'Please enter a valid email';
        } else if (password.length < 6) {
            err = 'Your password must have at least 6 characters';
        } else if (phone_number != null && (phone_number.length == 0 || !(phone_number.length === 10 && !isNaN(phone_number)))) {
            err = 'Please enter a valid phone number';
        }

        month = (month.length == 1 ? '0': '') + month;
        day = (day.length == 1 ? '0': '') + day;

        if (isNaN(month) || month.length != 2) {
            err = 'Please enter a valid month';
        } else if (isNaN(day) || day.length != 2) {
            err = 'Please enter a valid day';
        } else if (isNaN(year) || year.length != 4) {
            err = 'Please enter a valid year';
        }
        
        if (!(gen === 'Male' || gen === 'Female')) {
            err = 'Please enter a valid gender';
        }

        fname = capitalizeFirstLetter(fname);
        lname = capitalizeFirstLetter(lname);

        if (err !== null) {
            return res.send({'success': false, 'error': err});
        }

        let hashedP = await hashPassword(password);

        let r = await createProfile(fname, lname, email, hashedP, phone_number, gen, month, day, year, connect_key);
        if (r === null) {
            return res.send({'success': true});
        } else {
            return res.send({'success': false, 'error': r})
        }
    } catch (error) {
        res.send({'success': false, 'error': 'Something went wrong'})
    }
    // if ('password' in req.body && req.body.password === process.env.ADMIN_PASSWORD) {
    //     const token = jwt.sign({'role': 'user'}, JWT_SECRET, {expiresIn: '1h' });
    //     res.cookie('jwtToken', token, {httpOnly: true, maxAge: 3600000});
    //     res.send({'success': true});
    // } else {
    //     res.send({'success': false});
    // }
});

app.get('/dashboard', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'static', 'profile.html'));
});

app.get('/profile', async(req, res) => {
    res.redirect('/dashboard');
})

app.get('/me', async(req, res) => {
    try {
        if (!('jwtToken' in req.cookies)) {
            return res.send({'success': false, 'error': 'login'});
        } else {
            let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
            
            if (user === null) {
                return res.send({'success': false, 'error': 'login'});
            } else {
                info = {}
                if (typeof(user.profile_id) == 'undefined') {
                    return res.send({'success': false, 'error': 'login'});
                }
                player = (await pool.query(`SELECT * FROM Profile where profile_id=${user.profile_id}`))[0][0];
                
                if (typeof(player) == 'undefined') {
                    return res.send({'success': false, 'error': 'login'});
                }
                delete player['pass'];
                delete player['connect_key'];

                
                const past_matches = (await pool.query(`
                    SELECT m.*, 
                        (SELECT GROUP_CONCAT(mtp.profile_id)
                            FROM MatchTeamPlayer mtp
                            WHERE mtp.team_id = m.t1_id) as profile_ids_t1,
                            (SELECT GROUP_CONCAT(mtp.profile_id)
                            FROM MatchTeamPlayer mtp
                            WHERE mtp.team_id = m.t2_id) as profile_ids_t2
                    FROM \`Match\` m
                    WHERE EXISTS (SELECT 1
                                FROM MatchTeamPlayer mtp 
                                WHERE (mtp.team_id = m.t1_id OR mtp.team_id = m.t2_id) 
                                AND mtp.profile_id = ${player.profile_id})
                    ORDER BY m.time DESC
                    ${('more_matches' in req.query && req.query.more_matches == 'true') ? '' : 'LIMIT 6'};
                `))[0];
                const player_tournaments = (await pool.query(`
                    SELECT
                        tournament_team_member_id,
                        tournament_team_id,
                        tournament,
                        captain,
                        player
                    FROM TournamentTeamMember WHERE
                        profile_id=${player.profile_id};
                `))[0];
                // const player_teams = (await pool.query(`
                //     SELECT 
                //         TT.tournament_team_id,
                //         TT.name AS team_name,
                //         TT.tournament,
                //         TT.points,
                //         TT.placement,
                //         GROUP_CONCAT(CONCAT(TTM.profile_id, ':', TTM.player, ':', TTM.captain) ORDER BY TTM.profile_id SEPARATOR ',') AS team_members
                //     FROM 
                //         TournamentTeam TT
                //     JOIN 
                //         TournamentTeamMember TTM ON TT.tournament_team_id = TTM.tournament_team_id
                //     JOIN
                //         Tournament T ON TT.tournament = T.name
                //     WHERE
                //         TT.tournament_team_id IN (
                //             SELECT DISTINCT TTM2.tournament_team_id 
                //             FROM TournamentTeamMember TTM2
                //             WHERE TTM2.profile_id = ${player.profile_id}
                //         )
                //     GROUP BY 
                //         TT.tournament_team_id, TT.name, TT.tournament, TT.points, TT.placement
                //     ORDER BY 
                //         TT.tournament_team_id;
                // `))[0];
                const player_teams = (await pool.query(`
                    SELECT 
                        TT.tournament_team_id,
                        TT.name AS team_name,
                        TT.tournament,
                        TT.points,
                        TT.placement,
                        GROUP_CONCAT(DISTINCT CONCAT(TTM.profile_id, ':', TTM.player, ':', TTM.captain) ORDER BY TTM.profile_id SEPARATOR ',') AS team_members,
                        GROUP_CONCAT(DISTINCT CONCAT(ST.sub_id, ':', ST.ind) ORDER BY ST.ind) AS sub_teams,
                        GROUP_CONCAT(DISTINCT CONCAT(STM.sub_id, ':', STM.profile_id) ORDER BY STM.sub_id) AS sub_team_members,
                        GROUP_CONCAT(DISTINCT CONCAT(TEP.event, ':', TEP.profile_id) ORDER BY TEP.event) AS event_players,
                        GROUP_CONCAT(DISTINCT CONCAT(TET.event, ':', TET.event_team_id, ':', TET.p1, ':', TET.p2) ORDER BY TET.event SEPARATOR ';;') AS event_teams
                    FROM 
                        TournamentTeam TT
                    JOIN 
                        TournamentTeamMember TTM ON TT.tournament_team_id = TTM.tournament_team_id
                    LEFT JOIN
                        TournamentSubTeam ST ON TT.name = ST.team_name AND TT.tournament = ST.tournament
                    LEFT JOIN
                        TournamentSubTeamMember STM ON STM.sub_id = ST.sub_id
                    LEFT JOIN
                        TournamentEventPlayer TEP ON TEP.tournament_team_id = TT.tournament_team_id
                    LEFT JOIN
                        TournamentEventTeam TET ON TET.tournament_team_id = TT.tournament_team_id
                    WHERE
                        TT.tournament_team_id IN (
                            SELECT DISTINCT TTM2.tournament_team_id 
                            FROM TournamentTeamMember TTM2
                            WHERE TTM2.profile_id = ${player.profile_id}
                        )
                    GROUP BY 
                        TT.tournament_team_id, TT.name, TT.tournament, TT.points, TT.placement
                    ORDER BY 
                        TT.tournament_team_id;
                `))[0];
                
                const requests = (await pool.query(`
                    SELECT
                        request_id,
                        tournament_team,
                        tournament,
                        profile_id
                    FROM TournamentTeamRequest WHERE profile_id=${pool.escape(user.profile_id)};
                `))[0];
                const captain_requests = (await pool.query(`
                    SELECT
                        TT.name,
                        TT.tournament,
                        GROUP_CONCAT(TTR.profile_id) AS requests,
                        GROUP_CONCAT(TTR.request_id) AS request_ids
                    FROM TournamentTeam TT
                    JOIN TournamentTeamMember TTM ON TT.tournament_team_id=TTM.tournament_team_id
                    LEFT JOIN TournamentTeamRequest TTR ON TTR.tournament_team=TT.name AND TTR.tournament=TT.tournament
                    WHERE TTM.profile_id=${pool.escape(user.profile_id)} AND TTM.captain=1
                    GROUP BY TT.name, TT.tournament
                `))[0];

                const event_types = (await pool.query(`
                    SELECT name FROM TeamType;
                `))[0];

                
                info['player'] = player;
                info['past_matches'] = past_matches;
                info['player_tournaments'] = player_tournaments;
                info['player_teams'] = player_teams;
                info['requests'] = requests;
                info['captain_requests'] = captain_requests;
                info['event_types'] = event_types;
            
                
                return res.send({'success': true, info})
            }
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
});

app.get('/terms-of-service.pdf', async(req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'static', 'ncpa login agreement.pdf'));
})

app.post('/connect-account', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
            
        if (user === null)
            return res.send({'success': false, 'error': 'login'});

        if (req.body.connect_key.length < 10) {
            return res.send({'success': false, 'error': 'Please enter a valid connect key'});
        }

        let current_player = (await pool.query(`SELECT profile_id FROM Profile WHERE profile_id=${user.profile_id}`))[0][0];
        let connect_player = (await pool.query(`SELECT * FROM Profile WHERE connect_key=${pool.escape(req.body.connect_key)}`))[0][0];

        if (connect_player.pass != null) {
            return res.send({'success': false, 'error': 'Sorry, this profile has already been connected'})
        }

        if (current_player.singles_games_played + current_player.doubles_games_played + current_player.mixed_doubles_games_played > 0) {
            return res.send({'success': false, 'error': 'This player cannot be connected.'})
        }

        let r = (await pool.query(`
            UPDATE TournamentSubTeamMember SET profile_id=${current_player.profile_id} WHERE profile_id=${connect_player.profile_id};
            UPDATE TournamentEventPlayer SET profile_id=${current_player.profile_id} WHERE profile_id=${connect_player.profile_id};
            UPDATE MatchTeamPlayer SET profile_id=${current_player.profile_id} WHERE profile_id=${connect_player.profile_id};
            UPDATE TournamentTeamMember SET profile_id=${current_player.profile_id} WHERE profile_id=${connect_player.profile_id};

            UPDATE Profile SET
                college=${pool.escape(connect_player.college)},
                division=${pool.escape(connect_player.division)},
                wins=${pool.escape(connect_player.wins)},
                losses=${pool.escape(connect_player.losses)},
                singles_rating=${pool.escape(connect_player.singles_rating)},
                doubles_rating=${pool.escape(connect_player.doubles_rating)},
                mixed_doubles_rating=${pool.escape(connect_player.mixed_doubles_rating)},
                singles_games_played=${pool.escape(connect_player.singles_games_played)},
                doubles_games_played=${pool.escape(connect_player.doubles_games_played)},
                mixed_doubles_games_played=${pool.escape(connect_player.mixed_doubles_games_played)}
            WHERE profile_id=${current_player.profile_id};

            DELETE FROM Profile WHERE profile_id=${connect_player.profile_id};
        `));
        
        return res.send({'success': true})
    } catch (error) {
        console.log(error);
        return res.send({'success': false, 'error': 'Something went wrong'})
    }
})

async function refund(stripe_session_id, metadata) {
    try {
        const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent
        });
        if (refund.status === 'succeeded') {
            console.log('Refund successful');
            return true;
        } else {
            throw new Error('');
        }
    } catch (error) {
        console.error('Error creating refund:', error);
        try {
            let r = (await pool.query(`INSERT INTO Log(message) VALUES("Something went wrong when trying to refund ${metadata.profile_id} for tournament [${metadata.tournament}] (${stripe_session_id})")`));
        } catch (error) {
            console.log('Error when logging refund error')
        }
        return false;
    }
}

app.get('/success', async(req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'static', 'success.html'));
    } catch (error) {
        res.redirect('/');
    }
});

app.get('/register-success', async(req, res) => {
    try {

        let tm = (await pool.query(`SELECT * FROM TournamentTeamMember WHERE stripe_session_id=${pool.escape(req.query.session_id)}`))[0];
        if (tm.length == 0) {
            const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

            if (session.status === 'complete' && session.payment_status === 'paid') {
                let pid = session.metadata.profile_id;
                let tournament = session.metadata.tournament;

                let tm_old = (await pool.query(`SELECT tournament_team_member_id, player, captain FROM TournamentTeamMember WHERE profile_id=${pool.escape(pid)} AND tournament=${pool.escape(tournament)}`))[0];

                if (tm_old.length == 0) {  // New Player
                    r = (await pool.query(`INSERT INTO TournamentTeamMember(tournament, profile_id, player, stripe_session_id) VALUES("${tournament}", ${pid}, 1, ${pool.escape(req.query.session_id)})`))[0];

                    if (r.affectedRows === 0) {
                        // Refund - Something went wrong
                        let refund_status = await refund(req.query.session_id, session.metadata);
                        return res.redirect('/');
                    }
                    let params = new URLSearchParams({'t': tournament});
                    res.redirect(`/success?${params.toString()}`);
                } else {  // Player in tournament
                    tm_old = tm_old[0];
                    if (tm_old.player == 1) {  // Player already registered
                        // Refund - Player already registered
                        let refund_status = await refund(req.query.session_id, session.metadata);
                        return res.redirect('/');
                    } else {  // Captain but not player
                        console.log('Captain but not player')
                        let r = (await pool.query(`UPDATE TournamentTeamMember SET player=1 WHERE tournament_team_member_id=${pool.escape(tm_old.tournament_team_member_id)}`))
                        
                        if (r.affectedRows === 0) {
                            // Refund - Something went wrong
                            let refund_status = await refund(req.query.session_id, session.metadata);
                            return res.redirect('/');
                        }
                        
                        let params = new URLSearchParams({'t': tournament});
                        res.redirect(`/success?${params.toString()}`);
                    }
                }
                
            }
        } else {  // Link used
            res.redirect('/');
        }

    } catch (error) {
        console.log(error)
        res.redirect('/');
    }
});


// Admin
app.get('/admin', authenticate, async(req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'))
})

app.post('/admin/create-tournament', authenticate, async(req, res) => {
    try {
        if (req.body.name.length == 0) {
            res.send({'success': false, 'error': 'Please enter a name'});
        }
        keys = [];
        values = [];
        for (key in req.body) {
            keys.push(key);
            values.push(pool.escape(req.body[key]));
            // values.push(typeof(req.body[key]) === typeof('') ? `"${req.body[key]}"` : req.body[key])
        }

        let query = `INSERT INTO Tournament(${keys.join(', ')}) VALUES(${values.join(', ')})`;
        
        let r = (await pool.query(query))[0];

        if (r.affectedRows != 0) {
            return res.send({'success': true});
        } else {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }
    } catch (error) {
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'A tournament with that name already exists'});
        }
        return res.send({'success': false, 'error': 'Something went wrong'});
    }

})

app.post('/admin/delete-tournament', authenticate, async(req, res) => {
    try {
        let r = (await pool.query(`DELETE FROM Tournament WHERE name=${pool.escape(req.body.name)}`))[0];
        if (r.affectedRows != 0) {
            return res.send({'success': true});
        } else {
            throw new Error('');
        }
    } catch (error) {
        res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/admin/edit-tournament', authenticate, async(req, res) => {
    try {
        if (req.body.name.length == 0) {
            res.send({'success': false, 'error': 'Please enter a name'});
        }
        keys = [];
        values = [];
        for (key in req.body) {
            if (key != 'old_name') {
                keys.push(key);
                values.push(pool.escape(req.body[key]));
                // values.push(typeof(req.body[key]) === typeof('') ? `"${req.body[key]}"` : req.body[key])    
            }
        }

        let query = `UPDATE Tournament SET `;
        for (i in keys) {
            if (i != 0) {
                query += ', ' + keys[i] + '=' + values[i];
            } else {
                query += keys[i] + '=' + values[i];
            }
        }

        query += ` WHERE name=${pool.escape(req.body.old_name)}`;
        
        let r = (await pool.query(query))[0];

        if (r.affectedRows == 1) {
            res.send({'success': true});
        } else {
            res.send({'success': false, 'error': 'Something went wrong'});
        }
    } catch (error) {
        console.log(error);
        res.send({'success': false, 'error': 'Something went wrong'})
    }
});

app.post('/admin/create-tournament-team', authenticate, async(req, res) => {
    try {
        if (!('team_name' in req.body) | req.body.team_name.length == 0 | !('tournament_name' in req.body) | req.body.tournament_name.length == 0) {
            throw new Error('');
        }

        let r = (await pool.query(`INSERT INTO TournamentTeam(name, tournament) VALUES(${pool.escape(req.body.team_name)}, ${pool.escape(req.body.tournament_name)});`))[0];

        if (r.affectedRows == 1) {
            r = (await pool.query(`INSERT INTO TournamentSubTeam(team_name, tournament) VALUES(${pool.escape(req.body.team_name)}, ${pool.escape(req.body.tournament_name)});`))[0];
            if (r.affectedRows == 1) {
                return res.send({'success': true});
            } else {
                return res.send({'success': false, 'error': `Created ${req.body.team_name}, but there was an error when creating a sub team`});
            }
        } else {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }
    } catch (error) {
        console.log(error)
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'A team with that name already exists'});
        }
        return res.send({'success': false, 'error': 'Something went wrong'})
    }
})

app.get('/admin/get-tournaments', authenticate, async(req, res) => {
    try {
        let current = (await pool.query(`
            SELECT *
            FROM Tournament
            WHERE begin_date <= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
            AND end_date >= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
            ORDER BY begin_date DESC;
        `))[0];
        let past = (await pool.query(`
            SELECT *
            FROM Tournament
            WHERE end_date < DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
            ORDER BY begin_date DESC;
        `))[0];
        let upcoming = (await pool.query(`
            SELECT *
            FROM Tournament
            WHERE begin_date > DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
            ORDER BY begin_date ASC;
        `))[0];
        let tbd = (await pool.query(`
            SELECT *
            FROM Tournament
            WHERE begin_date IS NULL OR end_date IS NULL;
        `))[0];

        let teams = (await pool.query(`
            SELECT * FROM TournamentTeam;
        `))[0];

        let tournaments = {'current': current, 'past': past, 'upcoming': upcoming, 'tbd': tbd, 'teams': teams};
        res.send({'success': true, 'tournaments': tournaments})
    } catch (error) {
        console.log(error)
        res.send({'success': false, 'error': 'Something went wrong'})
    }
});

app.post('/admin/generate-new-team-captiain-key', authenticate, async(req, res) => {
    try {
        let key = '';
        while (true) {
            key = generateConnectKey();
            if ((await pool.query('SELECT * FROM TournamentTeam where captain_key="' + key + '";'))[0].length == 0) {
                break;
            }
        }
        if (key.length === 0) {
            throw new Error('');
        }

        let r = (await pool.query(`UPDATE TournamentTeam SET captain_key="${key}" WHERE tournament_team_id=${req.body.team_id} AND tournament="${req.body.tournament}"`))[0];

        if (r.affectedRows == 1) {
            res.send({'success': true, 'key': key});
        } else {
            res.send({'success': false, 'error': 'Something went wrong'});
        }
    } catch (error) {
        console.log(error);
        res.send({'success': false, 'error': 'Something went wrong'})
    }
})

app.get('/admin/merge-players', authenticate, async(req, res) => {
    return res.sendFile(path.join(__dirname, 'admin', 'merge-players.html'))
})

app.get('/admin/upload-tournament', authenticate, async(req, res) => {
    return res.sendFile(path.join(__dirname, 'admin', 'upload-tournament.html'))
})

app.get('/admin/reset-database', authenticate, async(req, res) => {
    return res.sendFile(path.join(__dirname, 'admin', 'reset-database.html'));
})

app.get('/admin/get-admin-tools', authenticate, async(req, res) => {
    filesR = await fs.readdir(path.join(__dirname, 'admin'));

    names = [];
    
    for (i in filesR) {
        if (filesR[i].includes('.html')) {
            let name = filesR[i].substring(0, filesR[i].length-5);
            if (name !== 'admin') {
                names.push(name);
            }
        }
    }

    res.send({'success': true, 'tools': names});
})

app.post('/admin/delete-tournament-team', authenticate, async(req, res) => {
    try {
        let r = (await pool.query(`DELETE FROM TournamentTeam WHERE tournament_team_id=${pool.escape(req.body.tournament_team_id)}`))[0];
        if (r.affectedRows === 0) {
            throw new Error('');
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
});

app.post('/admin/change-team-name', authenticate, async(req, res) => {
    try {
        let r = (await pool.query(`
            UPDATE TournamentTeam SET name=${pool.escape(req.body.new_team_name)} WHERE tournament_team_id=${pool.escape(req.body.tournament_team_id)};
        `));

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.get('/admin/get-players', authenticate, async(req, res) => {
    try {
        let r = (await pool.query(`
            SELECT * FROM Profile;
        `))[0];

        let results = [];
        for (let i in r) {
            results.push({});
            for (let key in r[i]) {
                if (key != 'pass') {
                    results[i][key] = r[i][key];
                }
            }
        }


        return res.send({'success': true, 'profiles': results});
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/admin/edit-profile', authenticate, async(req, res) => {
    try {
        let profile_info = req.body.profile_info;
        let pid = profile_info.profile_id;
        delete profile_info.profile_id;

        let query = 'UPDATE Profile SET ';
        for (let key in profile_info) {
            let s = key + '='
            if (key == 'first_name' || key == 'last_name') {
                s += pool.escape(capitalizeFirstLetter(profile_info[key]));
            } else {
                s += pool.escape(profile_info[key]);
            }
            query += s + ', ';
        }

        // query = query.substring(0, query.length-2);

        if (query.length > 5) {
            query = query.substring(0, query.length-2);
        }

        query += ` WHERE profile_id=${pool.escape(pid)};`

        let r = (await pool.query(query))[0];

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'})
        } else {
            return res.send({'success': true})
        }
    } catch (error) {
        console.log(error)
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
});

app.post('/admin/update-college-rankings', authenticate, async(req, res) => {
    try {
        let r = updateCollegeRankings();
        if (r)
            return res.send({'success': true});
        return res.send({'success': false, 'error': 'Something went wrong'});
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/admin/delete-profile', authenticate, async(req, res) => {
    try {
        let r = (await pool.query(`DELETE FROM Profile WHERE profile_id=${pool.escape(req.body.profile_id)}`))[0];
        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'})
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

// API
app.post('/api/edit-profile', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        to_set = Object.keys(req.body);
        if (to_set.length != 1) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        to_set = to_set[0];

        if (['first_name', 'last_name', 'email', 'phone_number'].includes(to_set)) {
            let ts = req.body[to_set];
            if (['first_name', 'last_name'].includes(to_set)) {
                ts = capitalizeFirstLetter(ts);
            }
            let r = (await pool.query(`
                UPDATE Profile SET ${to_set}=${pool.escape(ts)} WHERE profile_id=${pool.escape(user.profile_id)};
            `));

            if (r.affectedRows === 0) {
                return res.send({'success': false, 'error': 'Something went wrong'});
            } else {
                return res.send({'success': true, ts: ts});
            }
        }

        return res.send({'success': false, 'error': 'You do not have permission to set that'});

    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/simulator', async(req, res) => {
    try {
        let new_ratings = await simulateMatch(req.body.t1score, req.body.t2score, req.body.t1_ids, req.body.t2_ids);

        res.send({'success': true, new_ratings: new_ratings});
    } catch (error) {
        res.send({'success': false});
    }
})

app.get('/api/get-players', async(req, res) => {
    try {
        res.send(await getPlayers());
    } catch (error) {
        res.send({'success': false});
    }
})

app.get('/api/colleges', async(req, res) => {
    try {
        r = (await pool.query('SELECT * FROM College;'))[0];
        res.send({success: true, colleges: r});
    } catch (error) {
        res.send({success: false});
    }
})

app.post('/api/merge', authenticate, async(req, res) => {
    try {
        console.log(req.body);

        if (req.body.n1 != null && req.body.n2 != null) {

            let r = await mergePlayers(req.body.n1, req.body.n2);
            
            return res.send({'success': r});
        }

        return res.send({'success': false});
    } catch (error) {
        return res.send({'success': false});
    }
})

app.post('/api/upload-tournament', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.send({'success': false, 'error': 'No file uploaded'});
        }

        const info = await fs.readJson(req.file.path);

        if (req.body.name.length == 0) {
            return res.send({'success': false})
        }

        const r = await enterAllTournamentInfo(req.body.name, info);
        
        fs.unlink(req.file.path, (err) => {
            if (err) {
                console.log('Error deleting file: ', err);
            }
        })

        if (r == null) {
            return res.send({'success': true});
        } else {
            return res.send({'success': false, 'error': r});
        }
    } catch (error) {
        console.error(error);
        return res.send({'success': false, 'error': 'An error occurred while uploading the file'});
    }
});

app.post('/api/reset-database', async(req, res) => {
    console.log('RESETTING');

    // let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
    // if (user === null) {
    //     return res.send({'success': false, 'error': 'Please log in'});
    // }

    let r = await wipeDatabase();

    pf = {'role': 'user', 'profile_id': 1};
    const token = jwt.sign(pf, JWT_SECRET, {expiresIn: '24h'});
    res.cookie('jwtToken', token, {httpOnly: true, maxAge: 24*60*60*1000});

    if (r === true) {
        return res.send({'success': true});
    }

    return res.send({'success': false});
});

app.get('/api/logged-in', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        let r = (await pool.query(`SELECT profile_id FROM Profile WHERE profile_id=${user.profile_id}`))[0];
        
        if (r.length == 0) {
            return res.send({'success': false})
        } else {
            return res.send({'success': true})
        }
    } catch (error) {
        return res.send({'success': false})
    }
})



// Tournament

app.get('/api/get-tournaments', async(req, res) => {
    try {
        let to_grab = 'name, venue, venue_address, registration_open, registration_close, begin_date, end_date, description';

        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);

        if (user === null || !('profile_id' in user)) {
            throw new Error('');
        }

        let r = await Promise.all([
            pool.query(`
                SELECT ${to_grab}
                FROM Tournament
                WHERE begin_date <= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
                AND end_date >= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
                ORDER BY begin_date DESC;
            `),

            pool.query(`
                SELECT ${to_grab}
                FROM Tournament
                WHERE end_date < DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
                ORDER BY begin_date DESC;
            `),

            pool.query(`
                SELECT ${to_grab}
                FROM Tournament
                WHERE begin_date > DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'America/Chicago'))
                ORDER BY begin_date ASC;
            `),
            
            pool.query(`
                SELECT
                    T.name AS tournament_name,
                    GROUP_CONCAT(TT.name SEPARATOR ' ;; ') AS team_names
                FROM TournamentTeamMember TTM
                JOIN Tournament T ON TTM.tournament = T.name
                JOIN TournamentTeam TT ON TT.tournament = T.name
                WHERE TTM.profile_id = ${user.profile_id}
                GROUP BY T.name
            `),

        ]);


        let current = r[0][0];
        let past = r[1][0];
        let upcoming = r[2][0];
        let teams = r[3][0];

        let tournaments = {'current': current, 'past': past, 'upcoming': upcoming, 'teams': teams};
        res.send({'success': true, 'tournaments': tournaments})

    } catch (error) {
        console.log(error);
        return res.send({'success': false, 'error': 'Something went wrong'})
    }
})

app.post('/api/register-for-tournament', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
            
        if (user === null || user.profile_id === null) {
            return res.send({'success': false, 'error': 'Please log in first'});
        }

        let tm = (await pool.query(`SELECT * FROM TournamentTeamMember WHERE profile_id=${pool.escape(user.profile_id)} AND tournament=${pool.escape(req.body.tournament)} AND player=1`))[0];

        if (tm.length > 0) {
            return res.send({'success': false, 'error': 'You are already registered for this tournament'});
        }

        tournament = (await pool.query(`SELECT * FROM Tournament WHERE name="${req.body.tournament}"`))[0][0];
        
        let now = new Date();
        now = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

        if (tournament.registration_open === null || tournament.registration_close === null) {
            return res.send({'success': false, 'error': 'Registration is not open for ' + tournament.name})
        }
        if (tournament.registration_price === null) {
            return res.send({'success': false, 'error': "We're sorry, we have not set a price for registration yet. Please try again later."})
        }

        
        let ro = new Date(tournament.registration_open);
        ro.setHours(0, 0, 0, 0);
        let rc = new Date(tournament.registration_close);
        rc.setHours(23, 59, 59, 999);

        if (!(now >= ro && now <= rc)) {
            return res.send({'success': false, 'error': 'Registration is not open for ' + tournament.name})
        }
        
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Registration for ${tournament.name}`
                        },
                        unit_amount: tournament.registration_price*100  // Price
                    },
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: `${base_url}/register-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${base_url}/`,
            metadata: {
                profile_id: user.profile_id,
                tournament: tournament.name
            }
        });

        // console.log(session);

        return res.send({'success': true, 'url': session.url});
    } catch (error) {
        console.log('ERROR');
        return res.send({'success': false, 'error': 'Something went wrong'});
    }

    // return res.send({'success': false})
})

app.post('/api/become-captain', async(req, res) => {
    try {
        if (!('jwtToken' in req.cookies)) {
            return res.send({'success': false, 'error': 'authentication failed'})
        }

        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'authentication failed'})
        }

        let tm = (await pool.query(`SELECT tournament_team_id FROM TournamentTeamMember WHERE tournament=${pool.escape(req.body.t_name)} AND profile_id=${pool.escape(user.profile_id)}`))[0];

        let r = (await pool.query(`SELECT * FROM TournamentTeam WHERE tournament=${pool.escape(req.body.t_name)} AND captain_key=${pool.escape(req.body.captain_key)}`))[0];

        if (r.length === 0) {
            return res.send({'success': false, 'error': "Sorry we can't find a team with that captain key for " + req.body.t_name});
        }

        if (tm.length > 0 && tm[0].tournament_team_id != null && tm[0].tournament_team_id != r[0].tournament_team_id) {
            return res.send({'success': false, 'error': 'You cannot be in two teams at the same time'});
        }

        try {
            r = (await pool.query(`INSERT INTO TournamentTeamMember(tournament_team_id, tournament, profile_id, captain) VALUES(${r[0].tournament_team_id}, "${req.body.t_name}", ${user.profile_id}, 1)`))[0];
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                r = (await pool.query(`UPDATE TournamentTeamMember SET tournament_team_id=${pool.escape(r[0].tournament_team_id)}, captain=1 WHERE tournament="${req.body.t_name}" AND profile_id=${user.profile_id};`))[0];
            } else {
                throw error;
            }
        }

        if (r.affectedRows == 0) {
            throw new Error('');
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/send-team-request', async(req, res) => {
    try {

        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        if (user === null || !('profile_id' in user)) {
            return res.send({'success': false, 'error': 'authentication failed'})
        }
        
        let r = null;
        if (req.body.request === 0) {
            r = (await pool.query(`
                DELETE FROM TournamentTeamRequest WHERE profile_id=${pool.escape(user.profile_id)} AND tournament_team="${req.body.team_name}" AND tournament="${req.body.t_name}";
            `))[0];
        } else {
            r = (await pool.query(`
                INSERT INTO TournamentTeamRequest(profile_id, tournament_team, tournament) VALUES(${user.profile_id}, "${req.body.team_name}", "${req.body.t_name}");
            `))[0];
        }

        if (r.affectedRows == 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        } else {
            if ('insertId' in r) {
                return res.send({'success': true, 'insertId': r.insertId});
            }
            return res.send({'success': true})
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'You have already sent a request to join a team in this tournament'});
        }
        return res.send({'success': false, 'error': 'Something went wrong'})
    }
})

app.post('/api/remove-player-from-team', async(req, res) => {
    try {
        console.log('hi')
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT * FROM TournamentTeamMember TTM
            JOIN TournamentTeam TT ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.tournament=${pool.escape(req.body.t_name)} AND TT.name=${pool.escape(req.body.team_name)} AND TTM.profile_id=${user.profile_id}
        `))[0][0];

        if (tm.captain === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        let r = (await pool.query(`
            UPDATE TournamentTeamMember TTM
            JOIN TournamentTeam TT ON TT.tournament_team_id=TTM.tournament_team_id
            SET TTM.captain=0, TTM.tournament_team_id=NULL
            WHERE TT.name=${pool.escape(req.body.team_name)} AND TT.tournament=${pool.escape(req.body.t_name)} AND TTM.profile_id=${pool.escape(req.body.pid)}
        `))[0];

        await pool.query(`DELETE FROM TournamentSubTeamMember WHERE tournament=${pool.escape(req.body.t_name)} && profile_id=${req.body.pid}`);
        await pool.query(`DELETE FROM TournamentEventPlayer WHERE tournament=${pool.escape(req.body.t_name)} && profile_id=${req.body.pid}`);
    
        
        if (r.affectedRows == 0) {
            throw new Error('');
        } else {
            let tm = (await pool.query(`
                SELECT captain, player, tournament_team_member_id FROM TournamentTeamMember WHERE tournament=${pool.escape(req.body.t_name)} AND profile_id=${pool.escape(req.body.pid)}; 
            `))[0][0];
            if (tm.player == 0 && tm.captain == 0) {
                r = (await pool.query(`DELETE FROM TournamentTeamMember WHERE tournament_team_member_id=${pool.escape(tm.tournament_team_member_id)}`))[0];
            }
            if (r.affectedRows == 0) {
                return res.send({'success': false, 'error': error});
            } else {  
                return res.send({'success': true});
            }
        }

    } catch (error) {
        console.log(error)
        res.send({'success': false, 'error': error});
    }

})

app.post('/api/change-request-status', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT * FROM TournamentTeamMember TTM
            JOIN TournamentTeam TT ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.tournament=${pool.escape(req.body.t_name)} AND TT.tournament_team_id=${pool.escape(req.body.team_id)} AND TTM.profile_id=${user.profile_id}
        `))[0][0];

        if (tm.captain === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        let cap = 0;
        if (req.body.accept === 1) {
            let tm = (await pool.query(`
                SELECT tournament_team_member_id, captain FROM TournamentTeamMember WHERE profile_id=${pool.escape(req.body.pid)} AND tournament=${pool.escape(req.body.t_name)};
            `))[0][0];
            cap = tm.captain;
            let r = await pool.query(`
                UPDATE TournamentTeamMember SET tournament_team_id=${pool.escape(req.body.team_id)} WHERE tournament_team_member_id=${pool.escape(tm.tournament_team_member_id)};
            `)
            if (r.affectedRows === 0) {
                throw new Error('');
            }
        }

        let r = (await pool.query(`
            DELETE FROM TournamentTeamRequest WHERE request_id=${pool.escape(req.body.request_id)};
        `))[0];

        if (r.affectedRows === 0) {
            res.send({'success': false, 'error': 'Request doesn\'t exist'});
        } else {
            res.send({'success': true, 'cap': cap});
        }
    } catch (error) {
        console.log(error)
        res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/add-sub-team-member', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT sub_id FROM TournamentSubTeam TST
            JOIN TournamentTeam TT ON TT.tournament=TST.tournament AND TT.name=TST.team_name
            JOIN TournamentTeamMember TTM ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1 AND TTM.tournament=${pool.escape(req.body.tournament)} && TT.name=${pool.escape(req.body.team_name)} && TST.sub_id=${pool.escape(req.body.sub_id)}
        `))[0];

        let pl = (await pool.query(`
            SELECT gender FROM Profile WHERE profile_id=${pool.escape(req.body.add_profile_id)}
        `))[0];

        if (tm.length == 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        if (pl.length == 0) {
            return res.send({'success': false, 'error': 'Cannot find player'});
        }
        pl = pl[0];

        // Check how many similar gender
        let stm = (await pool.query(`
            SELECT gender FROM TournamentSubTeamMember WHERE sub_id=${pool.escape(req.body.sub_id)} AND gender="${pl.gender}"
        `))[0];

        let stms = (await pool.query(`
            SELECT profile_id FROM TournamentSubTeamMember WHERE tournament=${pool.escape(req.body.tournament)} AND profile_id=${pool.escape(req.body.add_profile_id)};
        `))[0];
        
        let teps = (await pool.query(`
            SELECT profile_id FROM TournamentEventPlayer WHERE tournament=${pool.escape(req.body.tournament)} AND profile_id=${pool.escape(req.body.add_profile_id)};
        `))[0];

        if (stm.length >= 2) {
            return res.send({'success': false, 'error': `You already have 2 ${pl.gender.toLocaleLowerCase()}s on this D1 team`})
        }
        if (stms.length > 0) {
            return res.send({'success': false, 'error': 'Player is already registered for a D1 team'});
        }
        if (teps.length > 0) {
            return res.send({'success': false, 'error': 'Player is already registered for a D2 event'});
        }

        let r = (await pool.query(`INSERT INTO TournamentSubTeamMember(sub_id, tournament, profile_id, gender) VALUES(${pool.escape(req.body.sub_id)}, ${pool.escape(req.body.tournament)}, ${pool.escape(req.body.add_profile_id)}, "${pl.gender}")`))[0];
        
        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'That player is already on a sub team.'})
        }
        return res.send({'success': false, 'error': 'Something went wrong'});
    }

})

app.post('/api/remove-player-from-sub-team', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT sub_id FROM TournamentSubTeam TST
            JOIN TournamentTeam TT ON TT.tournament=TST.tournament AND TT.name=TST.team_name
            JOIN TournamentTeamMember TTM ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1 AND TST.sub_id=${pool.escape(req.body.sub_id)}
        `))[0];

        if (tm.length === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        let r = (await pool.query(`
            DELETE FROM TournamentSubTeamMember WHERE sub_id=${pool.escape(req.body.sub_id)} AND profile_id=${pool.escape(req.body.remove_profile_id)};
        `))[0];
        
        if (r.affectedRows == 0) {
            throw new Error('');
        } else {
            return res.send({'success': true});
        }

    } catch (error) {
        res.send({'success': false, 'error': error});
    }

})

app.post('/api/add-sub-team', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT TT.tournament, TT.name FROM TournamentTeam TT
            JOIN TournamentTeamMember TTM ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1 AND TT.name=${pool.escape(req.body.team_name)} AND TT.tournament=${pool.escape(req.body.tournament)}
        `))[0];

        if (tm.length === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        r = (await pool.query(`INSERT INTO TournamentSubTeam(team_name, tournament) VALUES(${pool.escape(req.body.team_name)}, ${pool.escape(req.body.tournament)});`))[0];
        if (r.affectedRows == 1) {
            let ind = (await pool.query(`SELECT ind FROM TournamentSubTeam WHERE sub_id=${r.insertId}`))[0][0];
            return res.send({'success': true, sub_team: {sub_id: r.insertId, ind: ind.ind, members: []}});
        } else {
            return res.send({'success': false, 'error': `Created ${req.body.team_name}, but there was an error when creating a sub team`});
        }


    } catch (error) {
        console.log(error)
        res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/delete-sub-team', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT sub_id, TT.name, TT.tournament FROM TournamentSubTeam TST
            JOIN TournamentTeam TT ON TT.tournament=TST.tournament AND TT.name=TST.team_name
            JOIN TournamentTeamMember TTM ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1 AND TST.sub_id=${pool.escape(req.body.sub_id)}
        `))[0];

        if (tm.length === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        let r = (await pool.query(`DELETE FROM TournamentSubTeam WHERE sub_id=${pool.escape(req.body.sub_id)}`))[0];

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': "We can't find that sub team"});
        } else {
            await pool.query(`CALL ReindexSubTeams("${tm[0].name}", "${tm[0].tournament}");`)
            return res.send({'success': true})
        }


    } catch (error) {
        console.log(error)
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
});

app.post('/api/add-player-to-event', async(req, res) => {
    try {

        let stms = (await pool.query(`
            SELECT profile_id FROM TournamentSubTeamMember WHERE tournament=${pool.escape(req.body.tournament)} AND profile_id=${pool.escape(req.body.add_profile_id)};
        `))[0];
        
        let teps = (await pool.query(`
            SELECT profile_id FROM TournamentEventPlayer WHERE tournament=${pool.escape(req.body.tournament)} AND profile_id=${pool.escape(req.body.add_profile_id)} AND event=${pool.escape(req.body.event)};
        `))[0];

        if (stms.length > 0) {
            return res.send({'success': false, 'error': 'Player is already registered for a D1 team'});
        }
        if (teps.length > 0) {
            return res.send({'success': false, 'error': `Player is already registered for ${req.body.event}`});
        }

        let r = (await pool.query(`
            INSERT INTO TournamentEventPlayer(tournament_team_id, tournament, profile_id, event) VALUES(${pool.escape(req.body.team_id)}, ${pool.escape(req.body.tournament)}, ${pool.escape(req.body.add_profile_id)}, ${pool.escape(req.body.event)});
        `))[0];

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        console.log(error)
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'That player is already registered for this event'});
        }
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/delete-player-from-event', async(req, res) => {
    try {
        let r = (await pool.query(`
            DELETE FROM TournamentEventPlayer WHERE tournament_team_id=${pool.escape(req.body.team_id)} AND tournament=${pool.escape(req.body.tournament)} AND profile_id=${pool.escape(req.body.delete_profile_id)} AND event=${pool.escape(req.body.event)};
        `))[0];

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        } else {
            return res.send({'success': true});
        }
    } catch (error) {
        console.log(error)
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'That player is already registered for this event'});
        }
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/add-event-team', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT TT.tournament, TT.name FROM TournamentTeam TT
            JOIN TournamentTeamMember TTM ON TTM.tournament_team_id=TT.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1 AND TT.tournament_team_id=${pool.escape(req.body.team_id)} AND TT.tournament=${pool.escape(req.body.tournament)}
        `))[0];

        if (tm.length === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }

        let p1 = (await pool.query(`SELECT gender FROM Profile WHERE profile_id=${pool.escape(req.body.p1)}`))[0][0];
        let p2 = (await pool.query(`SELECT gender FROM Profile WHERE profile_id=${pool.escape(req.body.p2)}`))[0][0];

        if (p1.gender == p2.gender) {
            if (req.body.et.toLocaleLowerCase().includes('women')) {
                if (p1.gender != 'Female') {
                    return res.send({'success': false, 'error': 'Something went wrong'})
                }
            } else {
                if (p1.gender != 'Male') {
                    return res.send({'success': false, 'error': 'Something went wrong'})
                }
            }
        } else {
            if (!req.body.et.toLocaleLowerCase().includes('mixed')) {
                return res.send({'success': false, 'error': 'Something went wrong'})
            }
        }

        let exists = (await pool.query(`SELECT p1 FROM TournamentEventTeam WHERE (p1=${pool.escape(req.body.p1)} OR p1=${pool.escape(req.body.p2)} OR p2=${pool.escape(req.body.p1)} OR p2=${pool.escape(req.body.p2)}) AND event=${pool.escape(req.body.et)} AND tournament_team_id=${req.body.team_id}`))[0];

        if (exists > 0) {
            return res.send({'success': false, 'error': 'Player is already registered for an event'});
        }

        r = (await pool.query(`INSERT INTO TournamentEventTeam(tournament, tournament_team_id, event, p1, p2) VALUES(${pool.escape(req.body.tournament)}, ${pool.escape(req.body.team_id)}, ${pool.escape(req.body.et)}, ${pool.escape(req.body.p1)}, ${pool.escape(req.body.p2)});`))[0];
        if (r.affectedRows == 0) {
            return res.send({'success': false, 'error': 'Something went wrong'})
        } else {
            return res.send({'success': true, id: r.insertId});
        }


    } catch (error) {
        if (error.code == 'ER_DUP_ENTRY') {
            return res.send({'success': false, 'error': 'Player is already registered for an event'})
        }
        res.send({'success': false, 'error': 'Something went wrong'});
    }
})

app.post('/api/delete-event-team', async(req, res) => {
    try {
        let user = jwt.verify(req.cookies.jwtToken, JWT_SECRET);
        
        if (user === null) {
            return res.send({'success': false, 'error': 'Please log in'});
        }

        // Verify captain
        let tm = (await pool.query(`
            SELECT * FROM TournamentEventTeam TET
            JOIN TournamentTeamMember TTM ON TET.tournament_team_id=TTM.tournament_team_id
            WHERE TTM.profile_id=${user.profile_id} AND TTM.captain=1
        `))[0];

        if (tm.length === 0) {
            return res.send({'success': false, 'error': 'Something went wrong'});
        }
        
        let r = (await pool.query(`DELETE FROM TournamentEventTeam WHERE event_team_id=${pool.escape(req.body.event_team_id)}`))[0];

        if (r.affectedRows === 0) {
            return res.send({'success': false, 'error': "We can't find that event team"});
        } else {
            // await pool.query(`CALL ReindexSubTeams("${tm[0].name}", "${tm[0].tournament}");`)
            return res.send({'success': true})
        }


    } catch (error) {
        console.log(error)
        return res.send({'success': false, 'error': 'Something went wrong'});
    }
});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});








// Functions


async function createProfile(fname, lname, email, password, phone_number, gen, month, day, year, connect_key=null) {
    try {
        if (connect_key === null) {
            let key = '';
            while (true) {
                key = generateConnectKey();
                if ((await pool.query('SELECT * FROM Profile where connect_key="' + key + '";'))[0].length == 0) {
                    break;
                }
            }
            if (key.length === 0) {
                return 'Something went wrong';
            }
            let r = await pool.query(`INSERT INTO Profile(first_name, last_name, email, pass, phone_number, gender, birthday, connect_key) VALUES("${fname}", "${lname}", "${email}", "${password}", ${phone_number === null ? null : `"${phone_number}"`}, "${gen}", "${year + '-' + month + '-' + day}", "${key}");`);
            if (r[0].affectedRows == 1) {
                return null;
            } else {
                return 'Something went wrong';
            }
        } else {
            let profile = (await pool.query('SELECT * FROM Profile where connect_key="' + connect_key + '";'))[0];
            if (profile.length === 0) {
                return 'Invalid connect key';
            } else {
                profile = profile[0];
            }

            let new_key = generateConnectKey();

            let r = await pool.query(`UPDATE Profile SET first_name="${fname}", last_name="${lname}", email="${email}", pass="${password}", phone_number=${phone_number === null ? null : `"${phone_number}"`}, gender="${gen}", birthday="${year + '-' + month + '-' + day}", connect_key="${new_key}" WHERE profile_id=${profile.profile_id};`);
            if (r[0].affectedRows == 1) {
                return null;
            } else {
                return 'Something went wrong';
            }
        }
    } catch (error) {
        console.log(error)
        if (error.code == 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('profile.email')) {
                return 'An account with that email already exists';
            } else {
                return 'An account with that phone number already exists';
            }
        } else {
            return 'Something went wrong';
        }
    }
}

async function getPermission(id) {
    try {
        let pr = (await pool.query('SELECT permission FROM Profile WHERE profile_id=' + id))[0][0];
        return pr.permission;
    } catch {
        return null
    }
}

async function checkProfileLogin(email, password) {
    console.log(email, password)
}



function calculatePWW(winner_rating, loser_rating, k=3) {
    // let pct = 1/(1 + 10 ** ((p2 - p1)*k));
    let pww = 1/(1 + 20 ** (k*(loser_rating - winner_rating)));
    return pww;
}

async function calculateRatingChange(t1score, t2score, t1_rating, t2_rating, multi, log=false) {

    let t1_multi = (t1score > t2score ? 1 : -1);

    let pww = 0;

    let score_dif1 = 0;
    let score_dif2 = 0;
    if (t1_multi == 1) {
        pww = calculatePWW(t1_rating, t2_rating);
        score_dif1 = (2*multi*(1-pww)) * (t1score / (t1score + t2score) - pww);
        score_dif2 = (2*multi*(1 - pww)) * (t2score / (t1score + t2score) - (1 - pww));
    } else {
        pww = calculatePWW(t2_rating, t1_rating);
        score_dif1 = (2*multi*(1 - pww)) * (t1score / (t1score + t2score) - (1 - pww));
        score_dif2 = (2*multi*(1 - pww)) * ((t2score / (t1score + t2score)) - pww);
    }

    // console.log(score_dif1, score_dif2);

    let pid = (1-pww) * multi;

    let t1_change = (pid)*t1_multi + score_dif1;
    let t2_change = (pid)*-t1_multi + score_dif2;

    // TEST
    // if (log) {
    //     console.log('T1MULTI', t1_multi);
    //     console.log('PWW', pww);
    //     console.log('PID', pid);
    //     console.log('SDID', score_dif);
    // }

    return [t1_change, t2_change];
}


// min=.3, total_games=5, multi=.2

async function simulateMatch(t1score, t2score, t1_ids, t2_ids, min=.3, total_games=10, multi=.4) {
    try {
        t1_rating = 0;
        t2_rating = 0;

        let doubles = t1_ids.length > 1;

        let eligible_players = 0;
        let total_players = 0;

        if (doubles) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE profile_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE profile_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE profile_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE profile_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        }

        let match_eligibility = ((eligible_players == 0) || (eligible_players == total_players)); // true - no eligible players or everybody eligible, false - some eligible, some not
        // match_eligibility = true;

        // console.log(t1_rating, t2_rating)
        t1_rating /= t1_ids.length;
        t2_rating /= t2_ids.length;

        // console.log(t1_rating, t2_rating)

        // let t1_change = .1*(t1score - (t1_expected * (t1score + t2score))) // * ((1 - Math.abs(expected[0] - expected[1])) * .3);
        // let t2_change = .1*(t2score - (t2_expected * (t1score + t2score))) // * ((1 - Math.abs(expected[0] - expected[1])) * .3);

        let [t1_change, t2_change] = await calculateRatingChange(t1score, t2score, t1_rating, t2_rating, multi);

        t1_new_ratings = [];
        t2_new_ratings = [];

        for (let i = 0; i < t1_ids.length; i++) {
            if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE profile_id = ${t1_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                r = r[0][0].doubles_rating;
                if (match_eligibility || gp < 5) {
                    t1_new_ratings.push(Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games))));
                } else {
                    t1_new_ratings.push(r);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE profile_id = ${t1_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                r = r[0][0].singles_rating;
                if (match_eligibility || gp < 5) {
                    t1_new_ratings.push(Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games))))
                } else {
                    t1_new_ratings.push(r);
                }
            }
        }

        for (let i = 0; i < t2_ids.length; i++) {
            if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE profile_id = ${t2_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                r = r[0][0].doubles_rating;
                if (match_eligibility || gp < 5) {
                    t2_new_ratings.push(Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games))));
                } else {
                    t2_new_ratings.push(r);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE profile_id = ${t2_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                r = r[0][0].singles_rating;
                if (match_eligibility || gp < 5) {
                    t2_new_ratings.push(Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games))));
                } else {
                    t2_new_ratings.push(r);
                }
            }
        }

        return [t1_new_ratings, t2_new_ratings];
    } catch (error) {
        console.log(error);
        return null;
    }
    return null;
}

async function updateMatchDetails(match_id, t1score, t2score, min=.3, total_games=10, multi=.4) {
    try {
        await pool.query(`UPDATE \`Match\` SET t1score = ${t1score}, t2score = ${t2score} WHERE match_id = ${match_id}`).catch(err => {
            console.log(err)
            return false;
        });
        let match = await pool.query(`
            SELECT * FROM \`Match\`
            WHERE match_id = ${match_id};
        `);
        match = match[0][0];

        t1_ids = [];
        t2_ids = [];
        t1_rating = 0;
        t2_rating = 0;

        // let doubles = (match.t1p2_id != null) && (match.t2p2_id != null);
        let doubles = match.team_type.includes('Doubles');
        let mixed = match.team_type.includes('Mixed');
        let eligible_players = 0;
        let total_players = 0;

        let log = null;

        // for (let i = 1; i < 5; i++) {
        //     if (match[`t1p${i}_id`] !== null) {
        //         t1_ids.push(match[`t1p${i}_id`]);
        //     }
        // }

        // for (let i = 1; i < 5; i++) {
        //     if (match[`t2p${i}_id`] !== null) {
        //         t2_ids.push(match[`t2p${i}_id`]);
        //     }
        // }

        t1_ids = (await pool.query(`
            SELECT mtp.*
            FROM MatchTeamPlayer AS mtp
            JOIN MatchTeam AS mt ON mtp.team_id = mt.match_team_id
            WHERE mt.match_team_id = ${match.t1_id};
        `))[0];

        t2_ids = (await pool.query(`
            SELECT mtp.*
            FROM MatchTeamPlayer AS mtp
            JOIN MatchTeam AS mt ON mtp.team_id = mt.match_team_id
            WHERE mt.match_team_id = ${match.t2_id};
        `))[0];

        for (let i = 0; i < t1_ids.length; i++) {
            t1_ids[i] = t1_ids[i].profile_id;
        }

        for (let i = 0; i < t2_ids.length; i++) {
            t2_ids[i] = t2_ids[i].profile_id;
        }

        if (mixed) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, last_name FROM Profile WHERE profile_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].mixed_doubles_rating;
                    if (res[0][0].mixed_doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, last_name FROM Profile WHERE profile_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].mixed_doubles_rating;
                    if (res[0][0].mixed_doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else if (doubles) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Profile WHERE profile_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Profile WHERE profile_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Profile WHERE profile_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Profile WHERE profile_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        }

        let match_eligibility = ((eligible_players == 0) || (eligible_players == total_players)); // true - no eligible players or everybody eligible, false - some eligible, some not

        t1_rating /= t1_ids.length;
        t2_rating /= t2_ids.length;

        let [t1_change, t2_change] = await calculateRatingChange(t1score, t2score, t1_rating, t2_rating, multi, log != null);

        // if (log != null) {
        //     console.log('-------');
        //     console.log(`Team ${log}`);
        //     console.log(match_eligibility);
        //     console.log(t1score, t2score);
        //     console.log(t1_rating, t2_rating);
        //     console.log(t1_change, t2_change);
        // }

        let victory = t1score > t2score ? 1 : 2;

        // if (mixed && (t2_ids.indexOf((await getProfileID('Conor', 'Burns'))) != -1)) {
        //     console.log('2', victory, t2_change)
        // } else if (mixed && t1_ids.indexOf((await getProfileID('Conor', 'Burns'))) != -1) {
        //     console.log('1', victory, t1_change);
        // }

        // if (mixed && (t2_ids.indexOf((await getProfileID('Logan', 'Rosenbach'))) != -1)) {
        //     console.log('2', victory, t2_change)
        // } else if (mixed && t1_ids.indexOf((await getProfileID('Logan', 'Rosenbach'))) != -1) {
        //     console.log('1', victory, t1_change);
        // }

        for (let i = 0; i < t1_ids.length; i++) {
            if (mixed) {
                let r = await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, wins, losses FROM Profile WHERE profile_id = ${t1_ids[i]}`);
                let gp = r[0][0].mixed_doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].mixed_doubles_rating;
                    await pool.query(`UPDATE Profile SET mixed_doubles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, mixed_doubles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t1_ids[i]}`);
                }
            } else if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played, wins, losses FROM Profile WHERE profile_id = ${t1_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].doubles_rating;
                    await pool.query(`UPDATE Profile SET doubles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, doubles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t1_ids[i]}`);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played, wins, losses FROM Profile WHERE profile_id = ${t1_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].singles_rating;
                    await pool.query(`UPDATE Profile SET singles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, singles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t1_ids[i]}`);
                }
            }
        }

        for (let i = 0; i < t2_ids.length; i++) {
            if (mixed) {
                let r = await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, losses, wins FROM Profile WHERE profile_id = ${t2_ids[i]}`);
                let gp = r[0][0].mixed_doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].mixed_doubles_rating;
                    await pool.query(`UPDATE Profile SET mixed_doubles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, mixed_doubles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t2_ids[i]}`);
                }
            } else if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played, losses, wins FROM Profile WHERE profile_id = ${t2_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].doubles_rating;
                    await pool.query(`UPDATE Profile SET doubles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, doubles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t2_ids[i]}`);
                }
            } else {
                // console.log(match)
                let r = await pool.query(`SELECT singles_rating, singles_games_played, losses, wins FROM Profile WHERE profile_id = ${t2_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].singles_rating;
                    await pool.query(`UPDATE Profile SET singles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, singles_games_played = ${gp+1}, ${c}=${v} WHERE profile_id = ${t2_ids[i]}`);
                }
            }
        }
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}

async function wipeDatabase() {
    try {
        let f = await fs.readFile(path.join(__dirname, 'ncpa.sql'), 'utf-8').then(data => {
            return data;
        });

        let r = (await pool.query(f));

        let pass = await hashPassword(process.env.ADMIN_PASSWORD);
        r = (await pool.query(`INSERT INTO Profile(email, pass, first_name, last_name, permission) VALUES("admin@", "${pass}", "Admin", "Account", 5);`));

        if (r.affectedRows == 0) {
            throw new Error('');
        }

        await createTeamTypes();
        
        // const JWT_SECRET = generateConnectKey(40);
        // process.env.JWT_SECRET = JWT_SECRET;
        
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function resetDatabase(player=true) {
    await pool.query('DELETE FROM `Match`;');
    await pool.query('DELETE FROM MatchTeamPlayer;');
    await pool.query('DELETE FROM MatchTeam;');
    await pool.query('DELETE FROM TeamType;');
    if (player)
        await pool.query('DELETE FROM Profile;');
    await createTeamTypes();
    console.log('Database Reset!');
    return true;
}

async function resetTournaments(colleges=true) {
    await pool.query('DELETE FROM TournamentTeamMember;');
    await pool.query('DELETE FROM TournamentTeam;');
    await pool.query('DELETE FROM Court;');
    if (colleges) {
        await pool.query('DELETE FROM College;');
    }
    await pool.query('DELETE FROM Tournament;');
    console.log('Tournaments reset');
    return true;
}

async function getPlayers(to_grab=[]) {  // first_name, last_name, singles_rating, games_played
    to_grab = to_grab.concat(['profile_id', 'first_name', 'last_name', 'college', 'gender', 'division', 'singles_games_played', 'doubles_games_played', 'mixed_doubles_games_played', 'wins', 'losses', 'singles_rating', 'doubles_rating', 'mixed_doubles_rating']);
    let players = await pool.query('SELECT ' + to_grab.join(', ') + ' FROM Profile ORDER BY last_name ASC');
    return players[0];
}

async function getPlayer(first_name, last_name) {
    try {
        if (first_name.split(' ').length > 1) {
            first_name = first_name.substring(0, first_name.indexOf(' '));
        }
        if (last_name.split(' ').length > 1) {
            last_name = last_name.substring(last_name.lastIndexOf(' ')+1, last_name.length);
        }
        to_grab = ['profile_id', 'first_name', 'last_name', 'college', 'gender', 'division', 'singles_games_played', 'doubles_games_played', 'mixed_doubles_games_played', 'wins', 'losses', 'singles_rating', 'doubles_rating', 'mixed_doubles_rating'];
        let p = await pool.query(`SELECT ${to_grab.join(', ')} FROM Profile WHERE first_name="${first_name}" AND last_name="${last_name}"`);
        return p[0][0];
    } catch (error) {
        return null;
    }
}

async function getPlayerID(first_name, last_name) {
    try {
        if (first_name.split(' ').length > 1) {
            first_name = first_name.substring(0, first_name.indexOf(' '));
        }
        if (last_name.split(' ').length > 1) {
            last_name = last_name.substring(last_name.lastIndexOf(' ')+1, last_name.length);
        }
        let p = await pool.query(`SELECT profile_id FROM Player WHERE first_name="${first_name}" AND last_name="${last_name}"`);
        return p[0][0].profile_id;
    } catch (error) {
        return null;
    }
}

async function createMatch(t1_ids, t2_ids, team_type, datetime, affect_rating=true) {
    try {
        let keys = [];
        let values = [];
        for (let i = 1; i < t1_ids.length+1; i++) {
            keys.push(`t1p${i}_id`);
            values.push(`${t1_ids[i-1]}`);
        }
        for (let i = 1; i < t2_ids.length+1; i++) {
            keys.push(`t2p${i}_id`);
            values.push(`${t2_ids[i-1]}`);
        }

        // console.log(keys);
        // console.log(values);

        let t1_id = (await pool.query('INSERT INTO MatchTeam() VALUES();'))[0].insertId;
        let t2_id = (await pool.query('INSERT INTO MatchTeam() VALUES();'))[0].insertId;
        queries = [];
        for (let i = 0; i < t1_ids.length; i++) {
            queries.push(`INSERT INTO MatchTeamPlayer(profile_id, team_id) VALUES(${t1_ids[i]}, ${t1_id})`);
        }

        for (let i = 0; i < t2_ids.length; i++) {
            queries.push(`INSERT INTO MatchTeamPlayer(profile_id, team_id) VALUES(${t2_ids[i]}, ${t2_id})`);
        }

        await pool.query(queries.join('; '));

        let query = `INSERT INTO \`Match\`(t1_id, t2_id, time, affect_rating, team_type) VALUES (${t1_id}, ${t2_id}, "${datetime}", ${affect_rating}, "${team_type}")`

        res = await pool.query(query);

        // let match_id = await pool.query('SELECT LAST_INSERT_ID() AS match_id');
        let match_id = await pool.query(`SELECT match_id FROM \`Match\` WHERE match_id=${res[0].insertId}`);
        match_id = match_id[0][0].match_id;
        return match_id;
    } catch(err) {
        console.log(err)
        return null;
    }


    // try {
    //     if (t1_ids.length == 1) {
    //         res = await pool.query(`INSERT INTO \`Match\`(t1p1_id, t2p1_id, team_type) VALUES (${t1_ids[0]}, ${t2_ids[0]}, "${team_type}")`).catch(error => {
    //             console.log(error);
    //             return null;
    //         })
    //     } else {
    //         res = await pool.query(`INSERT INTO \`Match\`(t1p1_id, t1p2_id, t2p1_id, t2p2_id, team_type) VALUES (${t1_ids[0]}, ${t1_ids[1]}, ${t2_ids[0]}, ${t2_ids[1]}, "${team_type}")`).catch(error => {
    //             console.log(error);
    //             return null;
    //         })
    //     }
    //     let match_id = await pool.query('SELECT LAST_INSERT_ID() AS match_id');
    //     match_id = match_id[0][0].match_id;
    //     return match_id;
    // } catch(err) {
    //     return null;
    // }
}

async function simulateMatches(matches_fp, n_times=1) {
    // Reset Players
    await resetDatabase();

    const matches = await fs.readJson(matches_fp);

    for (let w = 0; w < n_times; w++) {
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].t1score + matches[i].t2score == 0) {
                continue
            }
            // Enter players in
            
            await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${matches[i].t1.split(' ')[0]}", "${matches[i].t1.split(' ')[1]}")`).catch(error => {
                ;
            })
            res = await pool.query(`SELECT * FROM Player WHERE first_name = "${matches[i].t1.split(' ')[0]}" AND last_name = "${matches[i].t1.split(' ')[1]}"`);
            if (res[0].length > 0) {
                t1p1_id = res[0][0].profile_id;
            } else {  // Something went wrong
                continue;
            }

            await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${matches[i].t2.split(' ')[0]}", "${matches[i].t2.split(' ')[1]}")`).catch(error => {
                ;
            })
            res = await pool.query(`SELECT * FROM Player WHERE first_name = "${matches[i].t2.split(' ')[0]}" AND last_name = "${matches[i].t2.split(' ')[1]}"`);
            if (res[0].length > 0) {
                t2p1_id = res[0][0].profile_id;
            } else {  // Something went wrong
                continue;
            }

            // Create Match
            let match_id = await createMatch(t1p1_id, t2p1_id);
            
            if (match_id != null) {
                // Update Match
                await updateMatchDetails(match_id, matches[i].t1score, matches[i].t2score);
            }
            
        }
        console.log(w);
    }

    let players = await getPlayers(['first_name', 'last_name', 'singles_rating', 'games_played'])

    console.log(players);



}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

async function setGender(profile_id, gender) {
    if (!(gender === 'Male' || gender === 'Female')) {
        return false;
    }
    if (typeof(profile_id) != 'object') {
        profile_id = [profile_id];
    }
    
    try {
        for (p in profile_id) {
            await pool.query(`UPDATE Profile SET gender="${gender}" WHERE profile_id=${profile_id[p]}`);
        }
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}

async function setDivision(profile_id, division) {
    if (!(division === 1 || division === 2)) {
        return false;
    }
    if (typeof(profile_id) != 'object') {
        profile_id = [profile_id];
    }
    try {
        for (p in profile_id) {
            let player = (await pool.query(`SELECT * FROM Profile WHERE profile_id=${profile_id[p]}`))[0][0];
            if ((player.singles_games_played == 0 && player.doubles_games_played == 0 && player.mixed_doubles_games_played == 0) || division !== player.division) {
                let rating = division === 1 ? 4.5 : 3.5;
                await pool.query(`UPDATE Profile SET division=${division}, singles_games_played=0, doubles_games_played=0, mixed_doubles_games_played=0, singles_rating=${rating}, doubles_rating=${rating}, mixed_doubles_rating=${rating}, wins=0, losses=0 WHERE profile_id=${profile_id[p]}`);
            } else {
                await pool.query(`UPDATE Profile SET division=${division} WHERE profile_id=${profile_id[p]}`);
            }
        }
        return true;
    } catch (error) {
        console.log('error')
        return false
    }
}

async function simulateNCPAMatches(matches_fp, n_times=1, file = false) {
    // Reset Players
    // await resetDatabase(false);
    let matches = []
    if (file) {
        matches = matches_fp;
    } else {
        matches = await fs.readJson(matches_fp);
    }

    month_dic = {
        'jan': '01',
        'feb': '02',
        'mar': '03',
        'apr': '04',
        'may': '05',
        'jun': '06',
        'jul': '07',
        'aug': '08',
        'sep': '09',
        'oct': '10',
        'nov': '11',
        'dec': '12'
    }

    matches.sort((a, b) => new Date(a.posted) - new Date(b.posted));   // Sort By Date Ascending
    for (let w = 0; w < n_times; w++) {
        for (let i = 0; i < matches.length; i++) {
            // Enter players in
            
            let spl = matches[i].posted.split(', ')
            let month = month_dic[spl[0].split(' ')[0].toLowerCase()]
            let day = spl[0].split(' ')[1];
            if (day.length == 1) {
                day = '0' + day;
            }
            let year = spl[1];
            
            let time = spl[2].split(' ')[0].split(':');
            let ampm = spl[2].split(' ')[1];
            if (ampm == 'PM' && time[0] != '12') {
                time[0] = (parseInt(time[0]) + 12).toString();
            }
            time = time.join(':');
            time += ':00';
            
            let datetime = `${year}-${month}-${day} ${time}`;
            
            let winning_players = matches[i].winning_team.split(' / ');
            let losing_players = matches[i].losing_team.split(' / ');

            t1_ids = [];
            t2_ids = [];
            
            for (let p = 0; p < winning_players.length; p++) {
                let f_name = winning_players[p].substring(0, winning_players[p].indexOf(' '));
                let l_name = winning_players[p].substring(winning_players[p].lastIndexOf(' ')+1, winning_players[p].length);
                // await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${f_name}", "${l_name}")`).catch(error => {
                //     ;
                // })
                res = await pool.query(`SELECT * FROM Profile WHERE first_name = "${f_name}" AND last_name = "${l_name}"`);
                if (res[0].length == 0) {
                    let r = await createPlayer({first_name: f_name, last_name: l_name});
                    if (r === false) {
                        console.log('Error with', f_name, l_name);
                        continue;
                    }
                    res = [[{profile_id: r}]]
                }
                if (res[0].length > 0) {
                    t1_ids.push(res[0][0].profile_id);
                } else {  // Something went wrong
                    console.log('Error with', f_name, l_name)
                    continue;
                }
            }

            for (let p = 0; p < losing_players.length; p++) {
                let f_name = losing_players[p].substring(0, losing_players[p].indexOf(' '));
                let l_name = losing_players[p].substring(losing_players[p].lastIndexOf(' ')+1, losing_players[p].length);
                // await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${f_name}", "${l_name}")`).catch(error => {
                //     ;
                // })
                res = await pool.query(`SELECT * FROM Profile WHERE first_name = "${f_name}" AND last_name = "${l_name}"`);
                if (res[0].length == 0) {
                    let r = await createPlayer({first_name: f_name, last_name: l_name});
                    if (r === false) {
                        console.log('Error with', f_name, l_name);
                        continue;
                    }
                    res = [[{profile_id: r}]]
                }
                if (res[0].length > 0) {
                    t2_ids.push(res[0][0].profile_id);
                } else {  // Something went wrong
                    console.log('Error with', f_name, l_name)
                    continue;
                }
            }

            // Create Match
            let m = '';
            if (matches[i].bracket.includes('Men')) {
                m += 'Mens ';
                await setGender(t1_ids.concat(t2_ids), 'Male');
            } else if (matches[i].bracket.includes('Women')) {
                m += 'Womens ';
                await setGender(t1_ids.concat(t2_ids), 'Female');
            } else {
                m += 'Mixed ';
            }
            if (matches[i].bracket.includes('Single')) {
                m += 'Singles';
            } else if (matches[i].bracket.includes('Double')) {
                m += 'Doubles';
            } else {continue;}

            if (matches[i].bracket.includes('D1')) {
                await setDivision(t1_ids.concat(t2_ids), 1);
                // m += 'D1';
            } else if (matches[i].bracket.includes('D2')) {
                await setDivision(t1_ids.concat(t2_ids), 2);
                // m += 'D2';
            }

            // if (m.includes('Mixed') && (t2_ids.indexOf((await getPlayerID('Aidan', 'Gorneau'))) != -1 || t1_ids.indexOf((await getPlayerID('Aidan', 'Gorneau'))) != -1)) {
            //     console.log(t2_ids.indexOf((await getPlayerID('Aidan', 'Gorneau'))) != -1)
            //     console.log(t1_ids, t2_ids);
            // }

            let match_id = await createMatch(t1_ids, t2_ids, m, datetime, true);
            
            if (match_id != null) {
                // Update Match
                await updateMatchDetails(match_id, parseFloat(matches[i].winning_score), parseFloat(matches[i].losing_score));
            }
            
        }
    }

    // let players = await getPlayers(['first_name', 'last_name', 'singles_rating', 'doubles_rating'])

    // console.log(players);
    console.log('DONE!');
    return true;

}

async function createPlayer(info) {
    try {
        if (info.first_name != null && info.last_name != null) {
            if (info.first_name.split(' ').length > 1) {
                info.first_name = info.first_name.substring(0, info.first_name.indexOf(' '));
            }
            if (info.last_name.split(' ').length > 1) {
                info.last_name = info.last_name.substring(info.last_name.lastIndexOf(' ')+1, info.last_name.length);
            }

            let key = '';
            while (true) {
                key = generateConnectKey();
                if ((await pool.query('SELECT * FROM Profile where connect_key="' + key + '"'))[0].length == 0) {
                    break;
                }
            }
            info.connect_key = key;

            let query = 'INSERT INTO Profile('
            for (key in info) {
                query += key + ', ';
            }
            query = query.substring(0, query.length-2);
            query += ') VALUES(';
            for (key in info) {
                if (typeof(info[key]) == typeof('')) {
                    info[key].replace(' ', '_')
                    query += `"${info[key]}", `;
                } else {
                    query += `${info[key]}, `;
                }
            }
            query = query.substring(0, query.length-2);
            query += ');';

            let res = await pool.query(query);
            
            return res[0].insertId;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error)
        if (error.errno == 1062) {
            ; // Already Exists
        }
        return false;
    }
}

async function createCollege(name, ranking=null) {
    try {
        if (ranking === null) {
            await pool.query(`INSERT INTO College(name) VALUES("${name}")`);
            return true;
        } else {
            await pool.query(`INSERT INTO College(name, ranking) VALUES("${name}", ${ranking})`);
            return true;
        }
    } catch (error) {
        if (error.errno == 1062) {
            ; // Already Exists
        }
        return false;
    }
}

async function loadNCPAPlayers(players_fp) {
    let players = await fs.readJson(players_fp);
    for (i in players) {

        playerRekeyed = {
            first_name: players[i]['First Name'],
            last_name: players[i]['Last Name'],
            gender: players[i]['Gender'],
            college: players[i]['Team'],
            singles_games_played: 0
        }

        await createPlayer(playerRekeyed);
    }
    console.log('NCPA Players Loaded!');
}

function generateConnectKey(chars=20) {
    let choose = '1234567890qwertyuiopasdfghjklzxcvbnm!@#$%^&*!@#$%^&*QWERTYUIOPASDFGHJKLZXCVBNM';
    let key = [];

    for (let i = 0; i < chars; i++) {
        key.push(choose.charAt(Math.floor(Math.random() * choose.length)));
    }

    return key.join('');
}

async function loadNCPATournamentPlayers(teams_fp, file=false) {

    let teams = {}
    if (file == true) {
        teams = teams_fp
    } else {
        teams = await fs.readJson(teams_fp);
    }

    for (let team in teams) {
        await createCollege(team);
        for (i in teams[team]) {
            let first_name = teams[team][i].substring(0, teams[team][i].indexOf(' '));
            player = {
                first_name: first_name,
                last_name: teams[team][i].substring(first_name.length+1, teams[team][i].length),
                college: team,
            }
            r = await createPlayer(player);
            
            // if (r !== true) {
            //     try {
            //         r = (await pool.query(`UPDATE Profile SET college="${team}" WHERE first_name="${first_name}" AND last_name="${player.last_name}"`));
            //     } catch (error) {
            //         console.log("Error updating " + first_name + ' ' + player.last_name);
            //         return false;
            //     }
            // }
        }
    }

    console.log('NCPA Players Loaded!');
    return true;
}

async function createTournament(tournament_name, venue=null, multiplier=1) {
    try {
        await pool.query(`INSERT INTO Tournament(name${venue == null ? '' : ', venue'}, multiplier) VALUES("${tournament_name}"${venue == null ? '' : ', "' + venue + '"'}, ${multiplier})`);
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
}

async function enterTournamentInfo(tournament_name, file=null) {
    try {
        let tournament_info = {};
        try {
            tournament_info = (await pool.query(`SELECT * FROM Tournament WHERE name="${tournament_name}"`))[0][0];
        } catch (error) {
            console.log('Tournament is not a valid tournament');
            return false;
        }
        let rounds = {};
        if (file === null) {
            rounds = await fs.readJson(tournament_name + '.json');
        } else {
            rounds = file;
        }
        let team_points = {};

        let errors = 0;

        let max_points = 0;

        for (division in rounds) {
            let temp_team_points = {};
            let round_points = 1
            for (round in rounds[division]) {
                for (t in rounds[division][round]) {
                    temp_team_points[rounds[division][round][t]] = round_points
                    if (round == 'Champion') {
                        temp_team_points[rounds[division][round][t]] += 1
                        console.log(division, round, rounds[division][round][t]);
                    }
                }
                max_points += (round == 'Champion' ? 2 : 1);
                round_points += 1
            }
            for (key in temp_team_points) {
                if (!(key in team_points)) {
                    team_points[key] = 0;
                }
                team_points[key] += temp_team_points[key];
            }
        };

        let teams = {};

        for (player in team_points) {
            let first_name = player.substring(0, player.indexOf(' '));
            try {
                team = (await getPlayer(first_name, player.substring(first_name.length+1, player.length))).college;
            } catch (error) {
                errors += 1;
            }
            if (!(team in teams)) {
                teams[team] = 0;
            }
            teams[team] += team_points[player];
        }

        console.log(errors + ' errors')

        await pool.query(`UPDATE Tournament SET max_points=${max_points} WHERE name="${tournament_name}";`)

        teams_array = Object.keys(teams).map(team => {
            return {team: team, score: teams[team]}
        })

        teams_array.sort((a, b) => {
            return b.score - a.score;
        })

        let rank_counter = 1;
        let rank_catchup_counter = rank_counter;
        let last_score = teams_array[0].score;
        for (t in teams_array) {
        //     let r = await pool.query(`UPDATE TournamentTeam SET points=${(teams[team]/max_points) * (teams.length/20) * tournament_info.multiplier}, placement=${teams[team].ranking} WHERE name="${team}";`)
            if (teams_array[t].score == last_score) {
                // let r = await pool.query(`UPDATE TournamentTeam SET points=${(teams_array[t].score/max_points) * (teams_array.length/20) * tournament_info.multiplier}, placement=${rank_catchup_counter} WHERE name="${teams_array[t].team}";`);
                let r = await pool.query(`INSERT INTO TournamentTeam(name, points, placement, tournament) VALUES("${teams_array[t].team}", ${teams_array[t].score * (teams_array.length/20)}, ${rank_catchup_counter}, "${tournament_name}");`);
            } else {
                // let r = await pool.query(`UPDATE TournamentTeam SET points=${(teams_array[t].score/max_points) * (teams_array.length/20) * tournament_info.multiplier}, placement=${rank_counter} WHERE name="${teams_array[t].team}";`)
                let r = await pool.query(`INSERT INTO TournamentTeam(name, points, placement, tournament) VALUES("${teams_array[t].team}", ${teams_array[t].score * (teams_array.length/20)}, ${rank_counter}, "${tournament_name}");`);
                rank_catchup_counter = rank_counter;
                last_score = teams_array[t].score;
            }
            rank_counter += 1;
        }
        
        console.log('Successfully entered tournament info')
        return true;
    } catch (error) {
        console.log(error)
        console.log('Something went wrong when entering tournament info');
        return false;
    }
}

async function updateCollegeRankings() {
    try {
        // await createTournament('2023 Championship', null, '2023-01-01');
        let tournaments = (await pool.query(`SELECT name, max_points, multiplier FROM Tournament ORDER BY end_date DESC LIMIT 20`))[0];
        let reliability = 1;
        let reliability_decrease = .95;
        let weight_decrease = .7
        let score_multiplier = 10;
        let tournament_teams = {}
        for (t_ind in tournaments) {
            let teams = (await pool.query(`SELECT * FROM TournamentTeam WHERE tournament="${tournaments[t_ind].name}"`))[0];
            for (team_ind in teams) {
                if (!(teams[team_ind].name in tournament_teams)) {
                    tournament_teams[teams[team_ind].name] = {};
                    tournament_teams[teams[team_ind].name].weight = 1;
                    tournament_teams[teams[team_ind].name].weights_sum = 0;
                    tournament_teams[teams[team_ind].name].score = 0;
                }
                tournament_teams[teams[team_ind].name].score = (((teams[team_ind].points / tournaments[t_ind].max_points) * score_multiplier) * reliability) * (tournament_teams[teams[team_ind].name].weight * tournaments[t_ind].multiplier);
                tournament_teams[teams[team_ind].name].weights_sum += (tournament_teams[teams[team_ind].name].weight * tournaments[t_ind].multiplier);
                tournament_teams[teams[team_ind].name].weight *= weight_decrease;
            }
            reliability *= reliability_decrease
        }

        let last_score = -1;
        for (team in tournament_teams) {
            tournament_teams[team].score /= tournament_teams[team].weights_sum;
            if (tournament_teams[team].score > last_score) {
                last_score = tournament_teams[team].score;
            }
        }

        tournament_teams = Object.entries(tournament_teams).sort((a, b) => b[1].score - a[1].score).reduce((team, [key, value]) => {
            team[key] = value;
            return team;
        }, {});

        let rank_counter = 1;
        let rank_catchup_counter = rank_counter;
        for (team in tournament_teams) {
            console.log(tournament_teams[team].score, last_score)
            if (tournament_teams[team].score < last_score) {
                tournament_teams[team].rank = rank_counter;
                rank_catchup_counter = rank_counter;
                last_score = tournament_teams[team].score;
            } else {
                tournament_teams[team].rank = rank_catchup_counter;
                last_score = tournament_teams[team].score;
            }
            rank_counter += 1;
            // console.log(team, tournament_teams[team].rank);
            try {
                await pool.query(`UPDATE College SET ranking=${tournament_teams[team].rank} WHERE name="${team}"`);
                console.log(rank)
            } catch (error) {
                try {
                    await pool.query(`INSERT INTO College(name, ranking) VALUES("${team}", ${tournament_teams[team].rank})`);
                } catch (error2) {
                    continue;
                }
            }
        }
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function enterAllTournamentInfo(tournament_name, info) {
    console.log('Creating Tournament...');
    let r = await createTournament(tournament_name, null);
    if (r == true) {
        console.log('Successfully Created Tournament', tournament_name);
    } else {return 'Error Creating Tournament (Tournament Name might already exist)'};

    console.log('Entering Players...');
    r = await loadNCPATournamentPlayers(info.teamlist, true);
    if (r == true) {
        console.log('Successfully Entered Players');
    } else {return 'Error entering players, please check your info file'}

    console.log('Simulating Matches...')
    r = await simulateNCPAMatches(info.scores, 1, true);
    if (r == true) {
        console.log('Successfully Simulated Matches');
    } else {return 'Error simulating matches, please check your info file'}

    console.log('Entering tournament placements...');
    r = await enterTournamentInfo(tournament_name, info['brackets'])
    if (r == true) {
        ;
    } else {return 'Error entering in tournament placements, please check your info file.'};

    console.log('Updating college rankings...');
    r = await updateCollegeRankings();
    if (r == true) {
        console.log('Successfully updated college rankings')
    } else {return 'Error updating college rankings'};


    return null;
}

async function mergePlayers(n1, n2) {
    try {
        f1 = n1.substring(0, n1.indexOf(' '));
        l1 = n1.substring(n1.lastIndexOf(' ')+1, n1.length);
        f2 = n2.substring(0, n2.indexOf(' '));
        l2 = n2.substring(n2.lastIndexOf(' ')+1, n2.length);
        let p1 = await getPlayer(f1, l1);
        let p2 = await getPlayer(f2, l2);
        
        let sg = p1.singles_games_played + p2.singles_games_played;
        let sr = p1.singles_rating;
        if (sg > 0) {
            if (p1.singles_games_played === 0) {
                sr = p2.singles_rating;
            } else if (p2.singles_games_played === 0) {
                sr = p1.singles_rating;
            } else {
                sr = (p1.singles_rating * (p1.singles_games_played/sg)) + (p2.singles_rating * (p2.singles_games_played/sg));
            }
        }

        let dg = p1.doubles_games_played + p2.doubles_games_played;
        let dr = p1.doubles_rating;
        if (dg > 0) {
            if (p1.doubles_games_played === 0) {
                dr = p2.doubles_rating;
            } else if (p2.doubles_games_played === 0) {
                dr = p1.doubles_rating;
            } else {
                dr = (p1.doubles_rating * (p1.doubles_games_played/dg)) + (p2.doubles_rating * (p2.doubles_games_played/dg));
            }
        }

        let mdg = p1.mixed_doubles_games_played + p2.mixed_doubles_games_played;
        let mdr = p1.mixed_doubles_rating;
        if (mdg > 0) {
            if (p1.mixed_doubles_games_played === 0) {
                mdr = p2.mixed_doubles_rating;
            } else if (p2.mixed_doubles_games_played === 0) {
                mdr = p1.mixed_doubles_rating;
            } else {
                mdr = (p1.mixed_doubles_rating * (p1.mixed_doubles_games_played/mdg)) + (p2.mixed_doubles_rating * (p2.mixed_doubles_games_played/mdg));
            }
        }

        let college = null;
        if (p1.college != null) {
            college = p1.college;
        } else if (p2.college != null) {
            college = p2.college;
        }

        let gender = null;
        if (p1.gender != null) {
            gender = p1.gender;
        } else if (p2.gender != null) {
            gender = p2.gender;
        }

        let division = null;
        if (p1.division != null) {
            division = p1.division;
        } else if (p2.division != null) {
            division = p2.division;
        }

        let email = null;
        if (p1.email != null) {
            email = p1.email;
        } else if (p2.email != null) {
            email = p2.email;
        }

        let phone_number = null;
        if (p1.phone_number != null) {
            phone_number = p1.phone_number;
        } else if (p2.phone_number != null) {
            phone_number = p2.phone_number;
        }

        let wins = p1.wins + p2.wins;
        let losses = p1.losses + p2.losses;

        // console.log(sg, sr);
        // console.log(dg, dr);
        // console.log(mdg, mdr);
        // console.log(college, gender, division, email, phone_number, wins, losses);

        if (f1 != null) {
            f1 = `"${f1}"`;
        }
        if (l1 != null) {
            l1 = `"${l1}"`;
        }
        if (college != null) {
            college = `"${college}"`;
        }
        if (phone_number != null) {
            phone_number = `"${phone_number}"`;
        }
        if (email != null) {
            email = `"${email}"`;
        }
        if (gender != null) {
            gender = `"${gender}"`;
        }

        let res = (await pool.query(`
            UPDATE Player SET
                first_name=${f1},
                last_name=${l1},
                college=${college},
                phone_number=${phone_number},
                email=${email},
                gender=${gender},
                division=${division},
                wins=${wins},
                losses=${losses},
                singles_rating=${sr},
                doubles_rating=${dr},
                mixed_doubles_rating=${mdr},
                singles_games_played=${sg},
                doubles_games_played=${dg},
                mixed_doubles_games_played=${mdg}
            WHERE profile_id=${p1.profile_id}
        `))[0];

        if (true) {
            const queries = [
                `UPDATE \`Match\` SET t1p1_id = ${p1.profile_id} WHERE t1p1_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t1p2_id = ${p1.profile_id} WHERE t1p2_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t1p3_id = ${p1.profile_id} WHERE t1p3_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t1p4_id = ${p1.profile_id} WHERE t1p4_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t2p1_id = ${p1.profile_id} WHERE t2p1_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t2p2_id = ${p1.profile_id} WHERE t2p2_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t2p3_id = ${p1.profile_id} WHERE t2p3_id = ${p2.profile_id};`,
                `UPDATE \`Match\` SET t2p4_id = ${p1.profile_id} WHERE t2p4_id = ${p2.profile_id};`,
                `DELETE FROM Player WHERE profile_id = ${p2.profile_id};`
            ];

            queries.forEach(async(query) => {
                await pool.query(query);
            })
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error);
    }
}

// let n1 = 'Caleb Schaunaman';
// let n2 = 'Logan Schaunaman';

// mergePlayers(n1, n2).then(res => {
//     console.log(res)
// }).then(async() => {
//     console.log((await getPlayer(n1)));
// })

// resetDatabase(true).then(async () => {
//     // // await loadNCPAPlayers('ncpa_players.json');
//     await loadNCPATournamentPlayers('2024 National Collegiate Pickleball Championship_teamlist.json')
//     await simulateNCPAMatches('ncpa_matches.json', n_times=1);
// });


// Rank Tournament Teams
// resetTournaments(true).then(async() => {
//     tournament_name = '2024 National Collegiate Pickleball Championship';
//     await loadNCPATournamentPlayers(tournament_name + '_teamlist.json');
//     r = await createTournament(tournament_name, venue='The Hub San Diego', date='2024-03-15', multiplier=1.5);
//     if (r == true)
//         console.log('Success created tournament - ' + tournament_name);
//     else
//         console.log('Error creating tournament - ' + tournament_name);

//     await enterTournamentInfo(tournament_name);
// });


// Update Rankings
// updateCollegeRankings().then(res => {
//     if (res === true) {
//         console.log('Successfully updated ranks');
//     } else {
//         console.log('Something went wrong when updating ranks')
//     }
// });


async function createTeamTypes() {
    let created_counter = 0;
    for (let i = 0; i < team_types.length; i++) {
        try {
            await pool.query('INSERT INTO TeamType(name, id) VALUES(' + `"${team_types[i]}", ${i}` + ');');
            created_counter += 1;
        } catch(error) {
            ;
        }
    }
    return created_counter;
}

// createTeamTypes();

// resetDatabase(true);








