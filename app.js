const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const exp = require('constants');
const fs = require('fs-extra');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: process.env.MYSQL_LOGIN,
    database: 'NCPA'
}).promise();

const app = express();
app.use(cors());

// const allowedOrigins = ['https://editor.wix.com', 'https://ncpaofficial.com', 'https://www.ncpaofficial.com'];
// app.use(cors({
//     origin: function(origin, callback) {
//         if (!origin || allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     }
// }));

const port = 3000;

const colleges = [
    'Texas Tech University',
    'Texas A&M University',
    'University of Texas (Austin)'
]

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

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
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

// Routes

app.get('/login', async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'))
});

app.post('/login', async(req, res) => {
    if ('password' in req.body && req.body.password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({'permissions': 'admin'}, process.env.JWT_SECRET, {expiresIn: '1h' });
        res.cookie('jwtToken', token, {httpOnly: true, maxAge: 3600000});
        res.send({'success': true});
    } else {
        res.send({'success': false});
    }
});

app.get('/admin', authenticate, async(req, res) => {
    // res.sendFile(path.join(__dirname, 'admin', 'merge-players.html'))
    return res.redirect('/merge');
})

app.get('/merge', authenticate, async(req, res) => {
    return res.sendFile(path.join(__dirname, 'admin', 'merge-players.html'))
})


// API

// app.post('/create-profile', async (req, res) => {
//     try {
//         const {first_name, last_name, college, email, phone_number} = req.body;
//         if (first_name.length == 0) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (last_name.length == 0) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (college.length == 0) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (email.length == 0) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (phone_number.length == 0) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         }

//         if (first_name.length > 20) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (last_name.length > 30) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (college.length > 100) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (email.length > 50) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         } else if (phone_number.length > 20 || isNaN(phone_number)) {
//             res.send({'success': false, 'error': 'Something went wrong'});
//             return;
//         }

//         if (colleges.indexOf(college) != -1) {
//             pool.query(`INSERT INTO Player(first_name, last_name, college, email, phone_number) VALUES ("${first_name}", "${last_name}", "${college}", "${email}", "${phone_number}");`).then(r => {
//                 res.send({'success': true});
//             }).catch(err => {
//                 try {
//                     err = err['sqlMessage'].toLowerCase();
//                     if (err.includes('duplicate')) {
//                         if (err.includes('phone_number')) {
//                             res.send({'success': false, 'error': 'An account with that phone number already exists'});
//                         } else if (err.includes('email')) {
//                             res.send({'success': false, 'error': 'An account with that email already exists'});
//                         } else {
//                             res.send({'success': false, 'error': 'Something went wrong'});
//                         }
//                     } else {
//                         res.send({'success': false, 'error': 'Something went wrong'});
//                     }
//                 } catch(error) {
//                     console.log(error);
//                     res.send({'success': false, 'error': 'Something went wrong'});;
//                 }
//             })
//         } else {
//             res.send({'success': false, 'error': 'Please enter a valid college'});
//             return;
//         }
//     } catch (error) {
//         res.send({'success': false});
//     }
// });

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

// app.get('/api/tournaments', async(req, res) => {
//     if (Object.keys(req.query).length == 0) {
//         try {
//             let tournaments = await pool.query('SELECT tournament_id, name, location, date FROM Tournament;');
//             res.send({'success': 'true', 'tournaments': tournaments[0]})
//         } catch (error) {
//             res.send({'success': 'false'})
//             return;
//         }
//     } else {
//         try {
//             if ('tournament_id' in req.query) {

//                 let tournament_info = (await pool.query(`
//                     SELECT tournament_id, name, location, date
//                     FROM Tournament
//                     WHERE tournament_id=${req.query.tournament_id}
//                 `))[0][0];

//                 let players = (await pool.query(`
//                     SELECT Player.first_name, Player.last_name, Player.singles_rating, Player.doubles_rating
//                     FROM TournamentPlayer
//                     JOIN Player ON TournamentPlayer.player_id = Player.player_id
//                     WHERE tournament_id=${req.query.tournament_id};
//                 `))[0];

//                 let tournament_teams = (await pool.query(`
//                     SELECT 
//                         player1.first_name AS p1_first_name,
//                         player1.last_name AS p1_last_name, 
//                         player2.first_name AS p2_first_name, 
//                         player2.last_name AS p2_last_name,
//                         team_name,
//                         TeamType.id AS team_type
//                     FROM TournamentTeam
//                     JOIN TournamentPlayer AS TP1 ON TournamentTeam.player1_id = TP1.tournament_player_id
//                     JOIN Player AS player1 ON TP1.player_id = player1.player_id
//                     JOIN TournamentPlayer AS TP2 ON TournamentTeam.player2_id = TP2.tournament_player_id
//                     JOIN Player AS player2 ON TP2.player_id = player2.player_id
//                     JOIN TeamType ON TournamentTeam.team_type_id = TeamType.id
//                     WHERE TournamentTeam.tournament_id=${req.query.tournament_id}
//                 `))[0];
                
//                 // let tournament_matches = (await pool.query(`
//                 //     SELECT
//                 //         TT1.player1_id
//                 //     FROM TournamentMatch
//                 //     JOIN TournamentTeam AS TT1 ON TournamentMatch.team1 = TT1.tournament_team_id
//                 //     WHERE TournamentMatch.tournament_id=${req.query.tournament_id};
//                 // `));
                
//                 // console.log(tournament_matches);
                
//                 res.send({'success': true, 'tournament_id': tournament_info.tournament_id, 'name': tournament_info.name, 'location': tournament_info.location, 'date': tournament_info.date, 'players': players, 'tournament_teams': tournament_teams})
//             }
//         } catch (error) {
//             res.send({'success': false})
//         }
//     }
// })

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

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

function calculatePWW(winner_rating, loser_rating, k=3) {
    // let pct = 1/(1 + 10 ** ((p2 - p1)*k));
    let pww = 1/(1 + 20 ** (k*(loser_rating - winner_rating)));
    return pww;
}

async function calculateRatingChange(t1score, t2score, t1_rating, t2_rating, multi, log=false) {
    // let t1_change = multi*(t1score/(t1score + t2score) - t1_expected);
    // let t2_change = multi*(t2score/(t1score + t2score) - t2_expected);

    // t1_change = (t1_change < 0 != t1score < t2score) ? t1_change/5 : t1_change;
    // t2_change = (t2_change < 0 != t2score < t1score) ? t2_change/5 : t2_change;

    let t1_multi = (t1score > t2score ? 1 : -1);

    let pww = 0;
    
    // if (t1_multi == 1) {
    //     pww = calculatePWW(t1_rating, t2_rating);
    // } else {
    //     pww = calculatePWW(t2_rating, t1_rating);
    // }

    // score_dif = .02 * (Math.abs(t1score - t2score));
    // let pid = (1-pww) * multi;

    // let t1_change = (pid + score_dif)*t1_multi;
    // let t2_change = (pid + score_dif)* (-1 * t1_multi);

    let score_dif1 = 0;
    let score_dif2 = 0;
    if (t1_multi == 1) {
        pww = calculatePWW(t1_rating, t2_rating);
        score_dif1 = (multi*(1-pww)) * (t1score / (t1score + t2score) - pww);
        score_dif2 = (multi*(1 - pww)) * (t2score / (t1score + t2score) - (1 - pww));
    } else {
        pww = calculatePWW(t2_rating, t1_rating);
        score_dif1 = (multi*(1 - pww)) * (t1score / (t1score + t2score) - (1 - pww));
        score_dif2 = (multi*(1 - pww)) * ((t2score / (t1score + t2score)) - pww);
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

// calculateRatingChange(11, 9, 3.925, 4.496, .2, log=true).then(res => {
//     console.log(res);
//     exit();
// })

async function simulateMatch(t1score, t2score, t1_ids, t2_ids, min=.1, total_games=25, multi=.2) {
    try {
        t1_rating = 0;
        t2_rating = 0;

        let doubles = t1_ids.length > 1;

        let eligible_players = 0;
        let total_players = 0;

        if (doubles) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
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
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                r = r[0][0].doubles_rating;
                if (match_eligibility || gp < 5) {
                    t1_new_ratings.push(Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games))));
                } else {
                    t1_new_ratings.push(r);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`);
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
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                r = r[0][0].doubles_rating;
                if (match_eligibility || gp < 5) {
                    t2_new_ratings.push(Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games))));
                } else {
                    t2_new_ratings.push(r);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`);
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

async function updateMatchDetails(match_id, t1score, t2score, min=.1, total_games=25, multi=.2) {
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

        // t1_ids.push(match.t1p1_id);
        // t2_ids.push(match.t2p1_id);
        // if (doubles) {
        //     t1_ids.push(match.t1p2_id);
        //     t2_ids.push(match.t2p2_id);
            

        //     for (let i = 0; i < t1_ids.length; i++) {
        //         await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
        //             if (res[0][0].last_name == 'Schaunaman') {
        //                 log = 1;
        //             }
        //             t1_rating += res[0][0].doubles_rating;
        //             if (res[0][0].doubles_games_played >= 5) {
        //                 eligible_players += 1;
        //             }
        //             total_players += 1
        //         })
        //     }
        //     for (let i = 0; i < t2_ids.length; i++) {
        //         await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
        //             if (res[0][0].last_name == 'Schaunaman') {
        //                 log = 2;
        //             }
        //             t2_rating += res[0][0].doubles_rating;
        //             if (res[0][0].doubles_games_played >= 5) {
        //                 eligible_players += 1;
        //             }
        //             total_players += 1
        //         })
        //     }
        // } else {
        //     for (let i = 0; i < t1_ids.length; i++) {
        //         await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
        //             t1_rating += res[0][0].singles_rating;
        //             if (res[0][0].singles_games_played >= 5) {
        //                 eligible_players += 1;
        //             }
        //             total_players += 1
        //         })
        //     }
        //     for (let i = 0; i < t2_ids.length; i++) {
        //         await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
        //             t2_rating += res[0][0].singles_rating;
        //             if (res[0][0].singles_games_played >= 5) {
        //                 eligible_players += 1;
        //             }
        //             total_players += 1
        //         })
        //     }
        // }

        for (let i = 1; i < 5; i++) {
            if (match[`t1p${i}_id`] !== null) {
                t1_ids.push(match[`t1p${i}_id`]);
            }
        }

        for (let i = 1; i < 5; i++) {
            if (match[`t2p${i}_id`] !== null) {
                t2_ids.push(match[`t2p${i}_id`]);
            }
        }

        if (mixed) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, last_name FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].mixed_doubles_rating;
                    if (res[0][0].mixed_doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, last_name FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].mixed_doubles_rating;
                    if (res[0][0].mixed_doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else if (doubles) {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT doubles_rating, doubles_games_played, last_name FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
                    t2_rating += res[0][0].doubles_rating;
                    if (res[0][0].doubles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
        } else {
            for (let i = 0; i < t1_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t1_ids[i]}`).then(res => {
                    t1_rating += res[0][0].singles_rating;
                    if (res[0][0].singles_games_played >= 5) {
                        eligible_players += 1;
                    }
                    total_players += 1
                })
            }
            for (let i = 0; i < t2_ids.length; i++) {
                await pool.query(`SELECT singles_rating, singles_games_played FROM Player WHERE player_id = ${t2_ids[i]}`).then(res => {
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

        // if (mixed && (t2_ids.indexOf((await getPlayerID('Conor', 'Burns'))) != -1)) {
        //     console.log('2', victory, t2_change)
        // } else if (mixed && t1_ids.indexOf((await getPlayerID('Conor', 'Burns'))) != -1) {
        //     console.log('1', victory, t1_change);
        // }

        // if (mixed && (t2_ids.indexOf((await getPlayerID('Logan', 'Rosenbach'))) != -1)) {
        //     console.log('2', victory, t2_change)
        // } else if (mixed && t1_ids.indexOf((await getPlayerID('Logan', 'Rosenbach'))) != -1) {
        //     console.log('1', victory, t1_change);
        // }

        for (let i = 0; i < t1_ids.length; i++) {
            if (mixed) {
                let r = await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, wins, losses FROM Player WHERE player_id = ${t1_ids[i]}`);
                let gp = r[0][0].mixed_doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].mixed_doubles_rating;
                    await pool.query(`UPDATE Player SET mixed_doubles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, mixed_doubles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t1_ids[i]}`);
                }
            } else if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played, wins, losses FROM Player WHERE player_id = ${t1_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].doubles_rating;
                    await pool.query(`UPDATE Player SET doubles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, doubles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t1_ids[i]}`);
                }
            } else {
                let r = await pool.query(`SELECT singles_rating, singles_games_played, wins, losses FROM Player WHERE player_id = ${t1_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 1) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].singles_rating;
                    await pool.query(`UPDATE Player SET singles_rating = ${Math.max(0, r + (t1_change * Math.max(min, 1 - gp/total_games)))}, singles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t1_ids[i]}`);
                }
            }
        }

        for (let i = 0; i < t2_ids.length; i++) {
            if (mixed) {
                let r = await pool.query(`SELECT mixed_doubles_rating, mixed_doubles_games_played, losses, wins FROM Player WHERE player_id = ${t2_ids[i]}`);
                let gp = r[0][0].mixed_doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].mixed_doubles_rating;
                    await pool.query(`UPDATE Player SET mixed_doubles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, mixed_doubles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t2_ids[i]}`);
                }
            } else if (doubles) {
                let r = await pool.query(`SELECT doubles_rating, doubles_games_played, losses, wins FROM Player WHERE player_id = ${t2_ids[i]}`);
                let gp = r[0][0].doubles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].doubles_rating;
                    await pool.query(`UPDATE Player SET doubles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, doubles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t2_ids[i]}`);
                }
            } else {
                // console.log(match)
                let r = await pool.query(`SELECT singles_rating, singles_games_played, losses, wins FROM Player WHERE player_id = ${t2_ids[i]}`);
                let gp = r[0][0].singles_games_played;
                if (match_eligibility || gp < 5) {
                    let c = 'losses';
                    let v = r[0][0].losses + 1;
                    if (victory === 2) {
                        c = 'wins';
                        v = r[0][0].wins + 1;
                    }
                    r = r[0][0].singles_rating;
                    await pool.query(`UPDATE Player SET singles_rating = ${Math.max(0, r + (t2_change * Math.max(min, 1 - gp/total_games)))}, singles_games_played = ${gp+1}, ${c}=${v} WHERE player_id = ${t2_ids[i]}`);
                }
            }
        }
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}

async function resetDatabase(player=true) {
    await pool.query('DELETE FROM `Match`;');
    await pool.query('DELETE FROM TeamType;');
    if (player)
        await pool.query('DELETE FROM Player;');
    await createTeamTypes();
    console.log('Database Reset!');
}

async function resetTournaments(colleges=true) {
    await pool.query('DELETE FROM TournamentTeam;');
    if (colleges) {
        await pool.query('DELETE FROM College;');
    }
    await pool.query('DELETE FROM Tournament;');
}

async function getPlayers(to_grab=['*']) {  // first_name, last_name, singles_rating, games_played
    let players = await pool.query('SELECT ' + to_grab.join(', ') + ' FROM Player ORDER BY last_name ASC');
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
        let p = await pool.query(`SELECT * FROM Player WHERE first_name="${first_name}" AND last_name="${last_name}"`);
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
        let p = await pool.query(`SELECT player_id FROM Player WHERE first_name="${first_name}" AND last_name="${last_name}"`);
        return p[0][0].player_id;
    } catch (error) {
        return null;
    }
}

async function createMatch(t1_ids, t2_ids, team_type) {
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

        let query = `INSERT INTO \`Match\`(${keys.join(', ')}, team_type) VALUES (${values.join(', ')}, "${team_type}")`

        res = await pool.query(query).catch(error => {
            console.log(error);
            return null;
        })

        let match_id = await pool.query('SELECT LAST_INSERT_ID() AS match_id');
        match_id = match_id[0][0].match_id;
        return match_id;
    } catch(err) {
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
                t1p1_id = res[0][0].player_id;
            } else {  // Something went wrong
                continue;
            }

            await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${matches[i].t2.split(' ')[0]}", "${matches[i].t2.split(' ')[1]}")`).catch(error => {
                ;
            })
            res = await pool.query(`SELECT * FROM Player WHERE first_name = "${matches[i].t2.split(' ')[0]}" AND last_name = "${matches[i].t2.split(' ')[1]}"`);
            if (res[0].length > 0) {
                t2p1_id = res[0][0].player_id;
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

async function setGender(player_id, gender) {
    if (!(gender === 'Male' || gender === 'Female')) {
        return false;
    }
    if (typeof(player_id) != 'object') {
        player_id = [player_id];
    }
    
    try {
        for (p in player_id) {
            await pool.query(`UPDATE Player SET gender="${gender}" WHERE player_id=${player_id[p]}`);
        }
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}

async function setDivision(player_id, division) {
    if (!(division === 1 || division === 2)) {
        return false;
    }
    if (typeof(player_id) != 'object') {
        player_id = [player_id];
    }
    try {
        for (p in player_id) {
            let player = (await pool.query(`SELECT * FROM Player WHERE player_id=${player_id[p]}`))[0][0];
            if ((player.singles_games_played == 0 && player.doubles_games_played == 0 && player.mixed_doubles_games_played == 0) || division !== player.division) {
                let rating = division === 1 ? 4.5 : 3.5;
                await pool.query(`UPDATE Player SET division=${division}, singles_games_played=0, doubles_games_played=0, mixed_doubles_games_played=0, singles_rating=${rating}, doubles_rating=${rating}, mixed_doubles_rating=${rating}, wins=0, losses=0 WHERE player_id=${player_id[p]}`);
            } else {
                await pool.query(`UPDATE Player SET division=${division} WHERE player_id=${player_id[p]}`);
            }
        }
        return true;
    } catch (error) {
        console.log('error')
        return false
    }
}

async function simulateNCPAMatches(matches_fp, n_times=1) {
    // Reset Players
    // await resetDatabase(false);

    let matches = await fs.readJson(matches_fp);
    matches.sort((a, b) => new Date(a.posted) - new Date(b.posted));   // Sort By Date Ascending
    for (let w = 0; w < n_times; w++) {
        for (let i = 0; i < matches.length; i++) {
            // Enter players in
            
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
                await createPlayer({first_name: f_name, last_name: l_name});
                res = await pool.query(`SELECT * FROM Player WHERE first_name = "${f_name}" AND last_name = "${l_name}"`);
                if (res[0].length > 0) {
                    t1_ids.push(res[0][0].player_id);
                } else {  // Something went wrong
                    continue;
                }
            }

            for (let p = 0; p < losing_players.length; p++) {
                let f_name = losing_players[p].substring(0, losing_players[p].indexOf(' '));
                let l_name = losing_players[p].substring(losing_players[p].lastIndexOf(' ')+1, losing_players[p].length);
                // await pool.query(`INSERT INTO Player(first_name, last_name) VALUES("${f_name}", "${l_name}")`).catch(error => {
                //     ;
                // })
                await createPlayer({first_name: f_name, last_name: l_name});
                res = await pool.query(`SELECT * FROM Player WHERE first_name = "${f_name}" AND last_name = "${l_name}"`);
                if (res[0].length > 0) {
                    t2_ids.push(res[0][0].player_id);
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

            let match_id = await createMatch(t1_ids, t2_ids, m);
            
            if (match_id != null) {
                // Update Match
                await updateMatchDetails(match_id, parseFloat(matches[i].winning_score), parseFloat(matches[i].losing_score));
            }
            
        }
    }

    let players = await getPlayers(['first_name', 'last_name', 'singles_rating', 'doubles_rating'])

    // console.log(players);
    console.log('DONE!');

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
            let query = 'INSERT INTO Player('
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
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
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

async function loadNCPATournamentPlayers(teams_fp) {
    let teams = await fs.readJson(teams_fp);

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
            if (r !== true) {
                try {
                    r = (await pool.query(`UPDATE Player SET college="${team}" WHERE first_name="${first_name}" AND last_name="${player.last_name}"`));
                } catch (error) {
                    console.log("Error updating " + first_name + ' ' + last_name)
                }
            }
        }
    }

    console.log('NCPA Players Loaded!');
}

async function createTournament(tournament_name, location=null, date=null, multiplier=1) {
    try {
        await pool.query(`INSERT INTO Tournament(name${location == null ? '' : ', location'}${date == null ? '' : ', date'}, multiplier) VALUES("${tournament_name}"${location == null ? '' : ', "' + location + '"'}${date == null ? '' : ', "' + date + '"'}, ${multiplier})`);
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
}

async function enterTournamentInfo(tournament_name) {
    try {
        let tournament_info = {};
        try {
            tournament_info = (await pool.query(`SELECT * FROM Tournament WHERE name="${tournament_name}"`))[0][0];
        } catch (error) {
            console.log('Tournament is not a valid tournament');
            return false;
        }
        rounds = await fs.readJson(tournament_name + '.json');
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
        let tournaments = (await pool.query(`SELECT name, max_points, multiplier FROM Tournament ORDER BY date DESC LIMIT 20`))[0];
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
            } catch {
                try {
                    await pool.query(`INSERT INTO College(name, ranking) VALUES("${team}", ${tournament_teams[team].rank})`);
                } catch {
                    continue;
                }
            }
        }
        return true;
    } catch (error) {
        return false;
    }
}

async function mergePlayers(n1, n2) {
    try {
        f1 = n1.substring(0, n1.indexOf(' '));
        l1 = n1.substring(n1.lastIndexOf(' ')+1, n1.length);
        f2 = n2.substring(0, n2.indexOf(' '));
        l2 = n2.substring(n2.lastIndexOf(' ')+1, n2.length);
        let p1 = await getPlayer(f1, l1);
        let p2 = await getPlayer(f2, l2);

        console.log(p1, p2);
        
        let sg = p1.singles_games_played + p2.singles_games_played
        let sr = (p1.singles_rating * (p1.singles_games_played/sg)) + (p2.singles_rating * (p2.singles_games_played/sg));
        let dg = p1.doubles_games_played + p2.doubles_games_played
        let dr = p1.doubles_rating;
        if (dg > 0) {
            if (p1.doubles_games_played === 0) {
                dr = p2.doubles_rating;
            } else if (p2.doubles_games_played === 0) {
                dr = p1.doubles_rating;
            } else {
                dr = (p1.doubles_rating * (p1.doubles_games_played/sg)) + (p2.doubles_rating * (p2.doubles_games_played/sg));
            }
        }
        let mdg = p1.mixed_doubles_games_played + p2.mixed_doubles_games_played
        let mdr = p1.mixed_doubles_rating;
        if (mdg > 0) {
            if (p1.mixed_doubles_games_played === 0) {
                mdr = p2.mixed_doubles_rating;
            } else if (p2.mixed_doubles_games_played === 0) {
                mdr = p1.mixed_doubles_rating;
            } else {
                mdr = (p1.mixed_doubles_rating * (p1.mixed_doubles_games_played/sg)) + (p2.mixed_doubles_rating * (p2.mixed_doubles_games_played/sg));
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

        let res = (await pool.query(`
            UPDATE Player SET
                first_name="${f1}",
                last_name="${l1}",
                college="${college}",
                email="${college}",
                phone_number="${phone_number}",
                email="${email}",
                gender="${gender}",
                division=${division},
                wins=${wins},
                losses=${losses},
                singles_rating=${sr},
                doubles_rating=${dr},
                mixed_doubles_rating=${mdr},
                singles_games_played=${sg},
                doubles_games_played=${dg},
                mixed_doubles_games_played=${mdg}
            WHERE player_id=${p1.player_id}
        `))[0];

        if (res != null) {
            const queries = [
                `UPDATE \`Match\` SET t1p1_id = ${p1.player_id} WHERE t1p1_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t1p2_id = ${p1.player_id} WHERE t1p2_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t1p3_id = ${p1.player_id} WHERE t1p3_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t1p4_id = ${p1.player_id} WHERE t1p4_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t2p1_id = ${p1.player_id} WHERE t2p1_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t2p2_id = ${p1.player_id} WHERE t2p2_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t2p3_id = ${p1.player_id} WHERE t2p3_id = ${p2.player_id};`,
                `UPDATE \`Match\` SET t2p4_id = ${p1.player_id} WHERE t2p4_id = ${p2.player_id};`,
                `DELETE FROM Player WHERE player_id = ${p2.player_id};`
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

// mergePlayers('Lily Egenrieder', 'Lily Egrenieder').then(res => {
//     console.log(res)
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
//     r = await createTournament(tournament_name, location='The Hub San Diego', date='2024-03-15', multiplier=1.5);
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








