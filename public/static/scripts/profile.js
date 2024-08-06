info = null;
players = [];
let tournaments = {};
let player_teams = [];
let currentViewTournament = {};
let currentD2Player = null;
let currentD2TeamInfo = {};


let months = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'May',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec'
};

function openCloseMenu() {
    let main = document.querySelector('.main');
    let back_arrow = document.querySelector('.menu span');

    if (main.classList.contains('slid-over')) {
        // back_arrow.innerText = '<';
        main.classList.remove('slid-over');
    } else {
        // back_arrow.innerText = '>';
        main.classList.add('slid-over');
    }
}

async function getPlayers() {
    ps = [];
    ps = await fetch('/api/get-players', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(res => res.json()).catch(err => {console.log('Error grabbing player')});

    ps_w = [];
    ps_m = [];
    ps_f = [];

    for (p in ps) {
        // if (ps[p].divison == null && ps[p].gender == null) {
        //     continue;
        // }
        // for (key in ps[p]) {
        //     if (ps[p][key] === null || ps[p][key] === '') {
        //         if (key === 'division') {
        //             ps[p][key] = 3;
        //         } else {
        //             ps[p][key] = 'N/A'
        //         }
        //     }
        // }
        ps[p].overall = 0;
        let changed = 0
        if (ps[p].singles_games_played >= 5) {
            ps[p].overall += ps[p].singles_rating;
            changed += 1;
        }
        if (ps[p].doubles_games_played >= 5) {
            ps[p].overall += ps[p].doubles_rating;
            changed += 1;
        }
        if (ps[p].mixed_doubles_games_played >= 5) {
            ps[p].overall += ps[p].mixed_doubles_rating;
            changed += 1;
        }
        if (changed === 3) {
            ps[p].overall /= changed;
        } else if (changed === 0) {
            ps[p].overall = -100;
        } else {
            ps[p].overall = -99 + ps[p].overall/changed;
        }
        if (ps[p].gender === 'Male') {
            ps_m.push(ps[p]);
        } else if (ps[p].gender == 'Female') {
            ps_w.push(ps[p]);
        } else {
            ps_f.push(ps[p]);
        }
    }

    ps_m = ps_m.sort((a, b) => b.overall - a.overall);
    ps_m.forEach((player, i) => {
        if (player.singles_games_played > 0 || player.doubles_games_played > 0 || player.mixed_doubles_games_played > 0) {
            player.ranking = i+1;
        } else {
            player.ranking = 'UR';
        }
    })

    ps_w = ps_w.sort((a, b) => b.overall - a.overall);
    ps_w.forEach((player, i) => {
        if (player.singles_games_played > 0 || player.doubles_games_played > 0 || player.mixed_doubles_games_played > 0) {
            player.ranking = i+1;
        } else {
            player.ranking = 'UR';
        }
    })

    let total_players = ps_w.length + ps_m.length + ps_f.length
    ps_f.forEach(player => {
        if (player.gender === 'Male') {
            player.ranking = ps_m.length+1;
        } else if (player.gender === 'Female') {
            player.ranking = ps_w.length+1;
        } else {
            player.ranking = total_players;
        }
    });

    ps_f = ps_f.concat(ps_m, ps_w).sort((a, b) => b.overall - a.overall);
    ps_f = ps_f.sort((a, b) => b.overall - a.overall);
    ps_f.forEach((player, i) => {
        player.overall_ranking = i+1;
        if (player.ranking === total_players) {
            player.ranking = player.overall_ranking;
        }
    })
    
    return ps_f;
}

async function getTournaments() {
    ts = await fetch('/api/get-tournaments').then(res => res.json());
    if (ts.success === false) {
        alert('Something went wrong when grabbing tournaments');
    }
    ts = ts['tournaments'];
    for (let type in ts) {
        if (type == 'teams' || type == 'requests') {
            continue;
        }
        for (i in ts[type]) {
            if (ts[type][i].begin_date != null) {
                ts[type][i].begin_date = ts[type][i].begin_date.substring(0, ts[type][i].begin_date.indexOf('T'));
                let split = ts[type][i].begin_date.split('-');
                ts[type][i].original_begin_date = ts[type][i].begin_date
                ts[type][i].begin_date = months[split[1]] + ' ' + ((split[2].length == 2 && split[2].charAt(0) == '0') ? split[2].charAt(1) : split[2]) + ', ' + split[0];
            }

            if (ts[type][i].end_date != null) {
                ts[type][i].end_date = ts[type][i].end_date.substring(0, ts[type][i].end_date.indexOf('T'));
                let split = ts[type][i].end_date.split('-');
                ts[type][i].original_end_date = ts[type][i].end_date
                ts[type][i].end_date = months[split[1]] + ' ' + ((split[2].length == 2 && split[2].charAt(0) == '0') ? split[2].charAt(1) : split[2]) + ', ' + split[0];
            }

            if (ts[type][i].registration_open != null) {
                ts[type][i].registration_open = ts[type][i].registration_open.substring(0, ts[type][i].registration_open.indexOf('T'));
                let split = ts[type][i].registration_open.split('-');
                ts[type][i].original_registration_open = ts[type][i].registration_open
                ts[type][i].registration_open = months[split[1]] + ' ' + ((split[2].length == 2 && split[2].charAt(0) == '0') ? split[2].charAt(1) : split[2]) + ', ' + split[0];
            }

            if (ts[type][i].registration_close != null) {
                ts[type][i].registration_close = ts[type][i].registration_close.substring(0, ts[type][i].registration_close.indexOf('T'));
                let split = ts[type][i].registration_close.split('-');
                ts[type][i].original_registration_close = ts[type][i].registration_close
                ts[type][i].registration_close = months[split[1]] + ' ' + ((split[2].length == 2 && split[2].charAt(0) == '0') ? split[2].charAt(1) : split[2]) + ', ' + split[0];
            }

            
            ts[type][i]['team_names'] = [];
            ts[type][i]['requests'] = [];
        }
    }
    for (let i in ts['teams']) {
        let broke = false;
        for (let type in ts) {
            if (type == 'teams' || type == 'requests') {
                continue;
            }
            for (let q in ts[type]) {
                if (ts[type][q].name == ts['teams'][i].tournament_name) {
                    if (ts[type][q].teams == null)
                        ts[type][q].teams = {};
                    ts[type][q].teams[ts.teams[i].name] = ts.teams[i];
                    if (ts.teams[i].team_members != null) {
                        ts[type][q].teams[ts.teams[i].name].team_members = ts[type][q].teams[ts.teams[i].name].team_members.split(';;');
                        let ms = [];
                        for (let tm in ts[type][q].teams[ts.teams[i].name].team_members) {
                            ms.push(getPlayer(parseInt(ts[type][q].teams[ts.teams[i].name].team_members[tm])));
                        }
                        ts[type][q].teams[ts.teams[i].name].team_members = ms;
                    } else {
                        ts[type][q].teams[ts.teams[i].name].team_members = [];
                    }
                    // ts[type][q]['team_names'] = ts['teams'][i]['team_names'].split(' ;; ');
                    broke = true;
                    break;
                }
            }
            if (broke)
                break;
        }
    }

    for (let i in ts['requests']) {
        for (let type in ts) {
            for (let i in ts[type]) {
                if (ts['requests'][i].tournament == ts[type][i].name) {
                    for (let i in ts[type][i].team_names) {

                    }
                    if (ts['requests'][i].tournament_team)
                    continue;
                }
            }
        }
    }

    delete ts['teams'];
    return ts;
}

function getPlayer(id) {
    if (players.length === 0) {
        return null;
    } else {
        for (i in players) {
            if (players[i].profile_id == id) {
                return players[i];
            }
        }
        return null;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupGrabs(setup=false) {
    document.querySelector('.loading').classList.remove('hide');


    let r = await fetch('/me').then(res => res.json()).catch(err => {
        window.location = '/login';
    });

    if (r.success === true) {
        info = r.info;
    } else {
        window.location = '/login';
        return;
    }

    players = await getPlayers();
    tournaments = await getTournaments();

    let new_player = await getPlayer(info.player.profile_id);
    for (key in new_player) {
        if (!(key in info.player)) {
            info.player[key] = new_player[key];
        }
    }

    if (info.past_matches == null) {
        info.past_matches = [];
    }
    info.past_matches.forEach(match => {
        if (typeof(match.profile_ids_t1) == 'string')
            match.profile_ids_t1 = match.profile_ids_t1.split(',');
        if (typeof(match.profile_ids_t2) == 'string')
            match.profile_ids_t2 = match.profile_ids_t2.split(',');
    });

    if (info.captain_requests == null) {
        info.captain_requests = [];
    }

    if (info.captain_requests == null) {
        info.captain_requests = [];
    }
    for (let i in info.captain_requests) {
        if (info.captain_requests[i].requests == null) {
            info.captain_requests[i].requests = [];
            info.captain_requests[i].requests_ids = [];
        } else {
            info.captain_requests[i].requests = info.captain_requests[i].requests.split(',');
            info.captain_requests[i].request_ids = info.captain_requests[i].request_ids.split(',');
        }
    }

    if (info.event_types == null) {
        info.event_types = [];
    }
    for (et in info.event_types) {
        info.event_types[et] = info.event_types[et].name;
    }

    for (let i in info.player_teams) {
        // Event players
        if (info.player_teams[i].event_players == null)
            info.player_teams[i].event_players = {};
        else
            info.player_teams[i].event_players = info.player_teams[i].event_players.split(',');
        let temp_ets = {};
        for (let et in info.event_types) {
            temp_ets[info.event_types[et]] = [];
        }
        for (let ep in info.player_teams[i].event_players) {
            info.player_teams[i].event_players[ep] = info.player_teams[i].event_players[ep].split(':');
            temp_ets[info.player_teams[i].event_players[ep][0]].push(await getPlayer(parseInt(info.player_teams[i].event_players[ep][1])));
        }
        info.player_teams[i].event_players = temp_ets;
        delete temp_ets;

        // Event Teams
        if (info.player_teams[i].event_teams == null) {
            info.player_teams[i].event_teams = {};
        } else {
            info.player_teams[i].event_teams = info.player_teams[i].event_teams.split(';;')
        }
        let temp_teams = {};
        for (let et in info.event_types) {
            temp_teams[info.event_types[et]] = [];
        }
        for (let et in info.player_teams[i].event_teams) {
            info.player_teams[i].event_teams[et] = info.player_teams[i].event_teams[et].split(':');
            temp_teams[info.player_teams[i].event_teams[et][0]].push({
                event_team_id: info.player_teams[i].event_teams[et][1],
                p1: await getPlayer(info.player_teams[i].event_teams[et][2]),
                p2: await getPlayer(info.player_teams[i].event_teams[et][3])
            })
        }
        info.player_teams[i].event_teams = temp_teams;
        delete temp_teams;

        // Team members
        if (info.player_teams[i].team_members == null)
            info.player_teams[i].team_members = [];
        else
            info.player_teams[i].team_members = info.player_teams[i].team_members.split(',');

        for (let t in info.player_teams[i].team_members) {
            info.player_teams[i].team_members[t] = info.player_teams[i].team_members[t].split(':');
        }

        // Sub teams
        if (info.player_teams[i].sub_teams === null) {
            info.player_teams[i].sub_teams = [];
        } else {
            info.player_teams[i].sub_teams = info.player_teams[i].sub_teams.split(',');
            for (let s in info.player_teams[i].sub_teams) {
                // TODO: Players
                info.player_teams[i].sub_teams[s] = info.player_teams[i].sub_teams[s].split(':');
                info.player_teams[i].sub_teams[s] = {
                    sub_id: info.player_teams[i].sub_teams[s][0],
                    ind: info.player_teams[i].sub_teams[s][1],
                    members: []
                }
            }
        }

        // Sub team members
        if (info.player_teams[i].sub_team_members == null) {
            info.player_teams[i].sub_team_members = [];
        } else {
            info.player_teams[i].sub_team_members = info.player_teams[i].sub_team_members.split(',');
            sub_mems = {};
            for (let stm in info.player_teams[i].sub_team_members) {
                info.player_teams[i].sub_team_members[stm] = info.player_teams[i].sub_team_members[stm].split(':');
                if (info.player_teams[i].sub_team_members[stm][0] in sub_mems) {
                    sub_mems[info.player_teams[i].sub_team_members[stm][0]].push(getPlayer(info.player_teams[i].sub_team_members[stm][1]));
                } else {
                    sub_mems[info.player_teams[i].sub_team_members[stm][0]] = [getPlayer(info.player_teams[i].sub_team_members[stm][1])];
                }
            }

            for (let s in sub_mems) {
                for (let st in info.player_teams[i].sub_teams) {
                    if (info.player_teams[i].sub_teams[st].sub_id == s) {
                        info.player_teams[i].sub_teams[st].members = sub_mems[s]
                    }
                }
            }
        }
        for (let pt in info.player_teams) {
            delete info.player_teams[pt].sub_team_members;
            for (let s in info.player_teams[pt].sub_teams) {
                if (!(Object.keys(info.player_teams[pt].sub_teams[s]).includes('members'))) {
                    info.player_teams[pt].sub_teams[s].members = '';
                }
            }
        }
    }

    if (!setup) {
        document.querySelector('.loading').classList.add('hide');
    }
}

async function setup(location=null) {
    document.querySelector('.loading').classList.remove('hide');

    await setupGrabs(true);

    if (info.player.permission == 5 && document.querySelector('.items .admin-btn') == null) {
        let admin_btn = document.createElement('button');
        admin_btn.innerText = 'Admin';
        admin_btn.classList.add('admin-btn');
        admin_btn.setAttribute('onclick', 'location.href = "/admin";')
        document.querySelector('.items').appendChild(admin_btn);
    }

    if (location === null) {
        const urlParams = new URLSearchParams(window.location.search);
        let v = urlParams.get('view');
        if (v === null) {
            await select('Tournaments');
        } else {
            await select(v);
        }
    } else {
        await select(location)
    }
    // select('Account Info');

    
    document.querySelector('.loading').classList.add('hide');
}

setup();


async function menuSelect(event) {
    let sel = document.querySelector('.items button.selected');
    
    if (sel !== null)
        sel.classList.remove('selected');
    
    event.target.classList.add('selected');
    
    select(event.target.innerText.trimEnd());
    
    document.querySelector('.span-div').click();
}

function createStatDiv(title, content) {
    let div = document.createElement('div');
    let h3 = document.createElement('h3');
    h3.innerText = title;
    let h1 = document.createElement('h1');
    h1.innerText = content;

    div.classList.add('stat-div');

    div.appendChild(h3);
    div.appendChild(h1);

    return div;
}

function extractNums(str) {
    new_str = '';
    for (i in str) {
        if (!isNaN(str[i])) {
            new_str += str[i];
        }
    }
    return new_str;
}

function selectDate(event, h) {
    event.stopPropagation();
    clickedPage();
    let e = event.target;
    if (h) {
        e = event.target.parentElement;
    }
    document.querySelector('.date-div').querySelectorAll('div').forEach(d => {
        d.classList.remove('selected');
    });

    e.classList.add('selected');

    selectD();
}

function playerOnTeam(t_name) {
    for (team in info.player_teams) {
        if (info.player_teams[team].tournament === t_name) {
            return true;
        }
    }

    return false;
}

function playerRegisteredForTournament(t_name) {
    for (let i in info.player_tournaments) {
        if (info.player_tournaments[i].tournament === t_name) {
            return info.player_tournaments[i]
        }
    }
    return null;
}

function playerOnATeam(t_name, pid) {
    for (let i in info.player_tournaments) {
        if (info.player_tournaments[i].tournament === t_name) {
            for (let tm in info.player_tournaments[i].teams) {
                for (let p in info.player_tournaments[i].teams[tm]) {
                    if (info.player_tournaments[i].teams[tm][p].profile_id == pid) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function getTournament(t_name) {
    for (let type in tournaments) {
        for (let i in tournaments[type]) {
            if (tournaments[type][i].name === t_name) {
                return tournaments[type][i];
            }
        }
    }
}

function selectD() {
    let type = document.querySelector('.date-div div.selected').innerText.toLowerCase().trimEnd();
    let t_cont = document.querySelector('.page.Tournaments .tournament-container');
    t_cont.innerHTML = '';

    if (type in tournaments && tournaments[type].length > 0) {
        for (i in tournaments[type]) {
            let t = document.createElement('div');
            t.classList.add('tournament');

            if (tournaments[type][i].name == null) {
                let name = document.createElement('h1');
                name.innerText = 'Name TBD';
                t.appendChild(name);
            } else {
                let name = document.createElement('h1');
                name.innerText = tournaments[type][i].name;
                t.appendChild(name);
            }
            
            if (tournaments[type][i].venue == null) {
                let location = document.createElement('h2');
                location.innerText = 'Venue TBD';
                t.appendChild(location);
            } else {
                let location = document.createElement('h2');
                location.innerText = tournaments[type][i].venue;
                t.appendChild(location);
            }

            if (tournaments[type][i].venue_address != null) {
                let venue_address = document.createElement('h3');
                venue_address.innerText = tournaments[type][i].venue_address;
                venue_address.setAttribute('onclick', `
                    window.open('https://www.google.com/maps/place/' + encodeURIComponent(${tournaments[type][i].venue_address}))
                `)
                t.appendChild(venue_address);
            }
            
            if (tournaments[type][i].registration_open != null && tournaments[type][i].registration_close != null) {
                let reg_date = document.createElement('h2');
                reg_date.innerText = 'Registration open from ' + tournaments[type][i].registration_open + ' to ' + tournaments[type][i].registration_close;
                t.appendChild(reg_date);
            }
            
            if (tournaments[type][i].begin_date != null) {
                let date = document.createElement('h2');
                if (tournaments[type][i].begin_date == null || tournaments[type][i].begin_date == tournaments[type][i].end_date) {
                    date.innerText = tournaments[type][i].begin_date;
                } else {
                    date.innerText = tournaments[type][i].begin_date + ' - ' + tournaments[type][i].end_date;
                }
                t.appendChild(date);
            }

            
            let tools = document.createElement('div');
            tools.classList.add('tools');
            let tool_counter = 0;
            let player_tournament = playerRegisteredForTournament(tournaments[type][i].name);
            if (player_tournament == null) {
                if (tournaments[type][i].registration_open != null) {

                    let now = new Date();
                    now = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
                    
                    let ro = new Date(tournaments[type][i].registration_open);
                    ro.setHours(0, 0, 0, 0);
                    let rc = new Date(tournaments[type][i].registration_close);
                    rc.setHours(23, 59, 59, 999);

                    if (now >= ro && now <= rc ) {
                        let register = document.createElement('button');
                        register.innerText = 'Register';
                        register.setAttribute('onclick', `
                            document.querySelector('.alert-screen').classList.add('show');
                            document.querySelector('.alert-screen .register').classList.add('show');
                            document.querySelector('.alert-screen .register').setAttribute('id', "reg_${tournaments[type][i].name}")
                        `);
                        
                        tools.appendChild(register);
                        tool_counter += 1;
                    }
                }
            } else {
                if (player_tournament.player == 1) {
                    let view = document.createElement('button');
                    if (player_tournament.tournament_team_id == null) {
                        view.innerText = 'Join Team';
                        view.classList.add('join');
                    } else {
                        view.innerText = 'Team';
                    }

                    // view.innerText = 'View';
                    view.setAttribute('onclick', `viewTournament("${player_tournament.tournament}")`)
                    
                    tools.appendChild(view);
                    tool_counter += 1;
                }

                if (player_tournament.captain == 1) {
                    let manage = document.createElement('button');
                    manage.innerText = 'Manage';
                    manage.classList.add('manage');
                    manage.setAttribute('onclick', `manageTournament("${player_tournament.tournament}")`)
                    
                    tools.appendChild(manage);
                    tool_counter += 1;
                }

                if (player_tournament.player + player_tournament.captain == 1) {
                    let register = document.createElement('button');
                    if (player_tournament.player == 1)
                        register.innerText = 'Register as a captain';
                    else if (player_tournament.captain == 1) {
                        register.innerText = 'Register as a player';
                    }
                    register.setAttribute('onclick', `
                        document.querySelector('.alert-screen').classList.add('show');
                            document.querySelector('.alert-screen .register').classList.add('show');
                        document.querySelector('.alert-screen .register').setAttribute('id', "reg_${tournaments[type][i].name}")
                    `);
                    tools.appendChild(register);

                    tool_counter += 1;
                }
                if (player_tournament.player + player_tournament.captain > 0) {
                    let view_all_teams = document.createElement('button');
                    view_all_teams.innerText = 'Info';
                    view_all_teams.setAttribute('onclick', `
                        viewTournament("${player_tournament.tournament}", loner=true);
                    `);
                    tools.appendChild(view_all_teams);
                    tool_counter += 1;
                }
            }
            if (tool_counter > 0)
                t.appendChild(tools);

            
            let t_info = document.createElement('div');
            t_info.classList.add('tools');
            let n_teams = document.createElement('h4');
            n_teams.innerText = tournaments[type][i].num_teams + (tournaments[type][i].num_teams == 1 ? ' Team' : ' Teams');
            t_info.appendChild(n_teams);
            if (tournaments[type][i].num_players >= 60) {
                let n_players = document.createElement('h4');
                n_players.innerText = tournaments[type][i].num_players + (tournaments[type][i].num_players == 1 ? ' Player' : ' Players');
                t_info.appendChild(n_players);
            }
            t.appendChild(t_info);
            
            t_cont.appendChild(t);
        }
    } else {
        let message = document.createElement('h1');
        message.innerText = "No tournaments found";
        t_cont.appendChild(message);
    }
}

async function sendTeamRequest(event, t_name, team_name, req) {
    document.querySelector('.loading').classList.remove('hide');
    let r = await fetch('/api/send-team-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            't_name': t_name,
            'team_name': team_name,
            'request': req
        })
    }).then(r => r.json());
    if (r.success === true) {
        if (req) {
            // alert('Sent request to join ' + team_name);
            if (req == 1) {
                let new_r = {
                    request_id: req.insertId,
                    profile_id: info.player.profile_id,
                    tournament_team: team_name,
                    tournament: t_name
                }
                info.requests.push(new_r);
            }
            viewTournament(currentViewTournament.name);
        } else {
            // alert('Cancelled request to join ' + team_name);
            if (req == 0) {
                for (let r in info.requests) {
                    if (info.requests[r].tournament == t_name && info.requests[r].tournament_team == team_name) {
                        info.requests.splice(r, 1);
                        break;
                    }
                }
            }
            viewTournament(currentViewTournament.name);
        }
    } else {
        if (r.error == 'authentication failed') {
            location.href = '/login';
        } else {
            alert(r.error);
        }
    }
    
    document.querySelector('.loading').classList.add('hide');
}

async function removePlayerFromTeam(event, t_name, team_name, pid, team_index) {
    document.querySelector('.loading').classList.remove('hide');
    let r = await fetch('/api/remove-player-from-team', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            t_name: t_name,
            team_name: team_name,
            pid: pid
        })
    }).then(r => r.json());

    if (r.success) {
        let p_ind = 0;
        for (let i in info.player_teams[team_index].team_members) {
            if (info.player_teams[team_index].team_members[i][0] == pid) {
                p_ind = i;
                break;
            }
        }
        info.player_teams[team_index].team_members.splice(p_ind, 1);

        for (let et in info.player_teams[team_index].event_players) {
            for (let p in info.player_teams[team_index].event_players[et]) {
                if (info.player_teams[team_index].event_players[et][p].profile_id == pid) {
                    info.player_teams[team_index].event_players[et].splice(p, 1);
                    p -= 1;
                }
            }
        }

        for (let st in info.player_teams[team_index].sub_teams) {
            for (let m in info.player_teams[team_index].sub_teams[st].members) {
                if (info.player_teams[team_index].sub_teams[st].members[m].profile_id == pid) {
                    info.player_teams[team_index].sub_teams[st].members.splice(m, 1);
                    m -= 1;
                }
            }
        }

        if (pid != info.player.profile_id) {
            manageTournament(currentViewTournament.name, 'manage');
        } else {
            setup();
        }
    } else {
        alert(r.error);
    }

    document.querySelector('.loading').classList.add('hide');
}

async function changeRequestStatus(event, pid, request_id, team_id, cap_req_ind, cap_index, accept, team_index) {
    document.querySelector('.loading').classList.remove('hide');
    let r = await fetch('/api/change-request-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            request_id: request_id,
            t_name: currentViewTournament.name,
            team_id: team_id,
            pid: pid,
            accept: accept
        })
    }).then(r => r.json());

    if (r.success === true) {
        info.captain_requests[cap_index].requests.splice(cap_req_ind, 1);
        info.captain_requests[cap_index].request_ids.splice(cap_req_ind, 1);
        if (accept === 1) {
            info.player_teams[team_index].team_members.push([pid.toString(), '1', r.cap.toString()]);
        }
        manageTournament(currentViewTournament.name, 'manage');
    } else {
        alert(r.error);
    }
    
    document.querySelector('.loading').classList.add('hide');
}

function requestExists(t_name, team_name) {
    for (let i in info.requests) {
        if (info.requests[i].tournament == t_name && info.requests[i].tournament_team == team_name) {
            return true;
        }
    }
    return false;
}

async function removePlayerFromSubTeam(sub_id, profile_id) {
    document.querySelector('.loading').classList.remove('hide');
    let r = await fetch('/api/remove-player-from-sub-team', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sub_id: sub_id,
            remove_profile_id: profile_id
        })
    }).then(r => r.json());

    if (r.success === true) {
        for (let i in info.player_teams) {
            for (let st in info.player_teams[i].sub_teams) {
                if (info.player_teams[i].sub_teams[st].sub_id == sub_id) {
                    for (let p in info.player_teams[i].sub_teams[st].members) {
                        if (info.player_teams[i].sub_teams[st].members[p].profile_id == profile_id) {
                            info.player_teams[i].sub_teams[st].members.splice(p, 1);
                            manageTournament(currentViewTournament.name, 'd1');
                            return;
                        }
                    }
                }
            }
        }
    } else {
        alert(r.error);
    }

    
    document.querySelector('.loading').classList.add('hide');
}

async function addPlayerToSubTeam(team, pl, s) {
    document.querySelector('.loading').classList.remove('hide');
    let body = {
        'team_name': team.team_name,
        'tournament': team.tournament,
        'sub_id': parseInt(team.sub_teams[s].sub_id),
        'add_profile_id': pl.profile_id
    }
    let r = await fetch('/api/add-sub-team-member', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(r => r.json());

    if (r.success === true) {
        for (let i in info.player_teams) {
            if (info.player_teams[i].team_name == team.team_name && info.player_teams[i].tournament == team.tournament) {
                for (let st in info.player_teams[i].sub_teams) {
                    if (info.player_teams[i].sub_teams[st].sub_id == team.sub_teams[s].sub_id) {
                        info.player_teams[i].sub_teams[st].members.push(pl);
                        manageTournament(currentViewTournament.name, 'd1');
                        addPlayerX();
                        document.querySelector('.loading').classList.add('hide');
                        return;
                    }
                }
            }
        }
    } else {
        alert(r.error);
    }
    
    document.querySelector('.loading').classList.add('hide');
}

async function addPlayerToEvent(team, et, pl) {
    document.querySelector('.loading').classList.remove('hide');
    let body = {
        'team_id': team.tournament_team_id,
        'tournament': team.tournament,
        'event': et,
        'add_profile_id': pl.profile_id
    }
    let r = await fetch('/api/add-player-to-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(r => r.json());

    if (r.success === true) {
        for (let i in info.player_teams) {
            if (info.player_teams[i].team_name == team.team_name && info.player_teams[i].tournament == team.tournament) {
                for (let event_type in info.player_teams[i].event_players) {
                    if (et == event_type) {
                        info.player_teams[i].event_players[et].push(pl);
                        manageTournament(currentViewTournament.name, 'd2');
                        addPlayerX();
                        document.querySelector('.loading').classList.add('hide');
                        return;
                    }
                }
            }
        }
    } else {
        alert(r.error);
    }
    
    document.querySelector('.loading').classList.add('hide');
}

async function deletePlayerFromEvent(team, et, pl) {
    document.querySelector('.loading').classList.remove('hide');
    let body = {
        'team_id': team.tournament_team_id,
        'tournament': team.tournament,
        'event': et,
        'delete_profile_id': pl.profile_id
    }
    let r = await fetch('/api/delete-player-from-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(r => r.json());

    if (r.success === true) {
        for (let i in info.player_teams) {
            if (info.player_teams[i].team_name == team.team_name && info.player_teams[i].tournament == team.tournament) {
                for (let event_type in info.player_teams[i].event_players) {
                    if (et == event_type) {
                        for (p in info.player_teams[i].event_players[et]) {
                            if (info.player_teams[i].event_players[et][p].profile_id == pl.profile_id) {
                                info.player_teams[i].event_players[et].splice(p, 1);
                                manageTournament(currentViewTournament.name, 'd2');
                                addPlayerX();
                                document.querySelector('.loading').classList.add('hide');
                                return;
                            }
                        }
                    }
                }
            }
        }
    } else {
        alert(r.error);
    }
    
    document.querySelector('.loading').classList.add('hide');
}

function viewLoner(t_name, t_view, loner=true) {
    let header = document.createElement('div');
    header.classList.add('header');

    let name = document.createElement('h1');
    name.innerText = currentViewTournament.name;
    header.appendChild(name);

    if (currentViewTournament.venue !== null) {
        let loc = document.createElement('h2');
        loc.innerText = currentViewTournament.venue;
        header.appendChild(loc);
    }

    if (currentViewTournament.begin_date !== null) {
        let date = document.createElement('h2');
        date.innerText = currentViewTournament.begin_date;
        if (currentViewTournament.end_date !== null) {
            date.innerText = currentViewTournament.begin_date + ' - ' + currentViewTournament.end_date;
        }
        header.appendChild(date)
    }

    t_view.appendChild(header);

    let sites = document.createElement('div');
    sites.classList.add('sites');
    
    let teams = document.createElement('button');
    teams.innerText = 'Teams';
    sites.appendChild(teams);

    teams.addEventListener('click', (event) => {
        document.querySelectorAll('.page.Tournaments .t-view .sites button').forEach(btn => {
            btn.classList.remove('selected');
        });

        event.target.classList.add('selected');

        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';

        let teams_counter = 0;

        for (let team in currentViewTournament.teams) {
            teams_counter += 1;
            let team_d = document.createElement('div');
            team_d.classList.add('team');

            let team_span = document.createElement('span');
            team_span.innerText = team;
            team_d.appendChild(team_span)

            if (loner == true) {
                let options = document.createElement('div');
                options.classList.add('options');

                let count = 0;
                if (!requestExists(currentViewTournament.name, team)) {
                    let send = document.createElement('button');
                    send.innerText = 'Request';
                    send.setAttribute('onclick', `sendTeamRequest(event, "${currentViewTournament.name}", "${team}", 1)`);
                    options.appendChild(send);
                    count += 1;
                } else {
                    let cancel = document.createElement('button');
                    cancel.innerText = 'Cancel';
                    cancel.classList.add('cancel');
                    cancel.setAttribute('onclick', `sendTeamRequest(event, "${currentViewTournament.name}", "${team}", 0)`);
                    options.appendChild(cancel);
                    count += 1;
                }
                
                if (count > 0)
                    team_d.appendChild(options);
            } else {
                team_d.addEventListener('click', event => {
                    let e = event.target;
                    while (!e.classList.contains('team')) {
                        e = e.parentElement;
                    }
                    if (e.classList.contains('dropped')) {
                        e.classList.remove('dropped');
                        e.style.maxHeight = '1em';
                    } else {
                        e.classList.add('dropped');
                        let bottom_height = e.querySelector('.bottom').scrollHeight;
                        if (bottom_height > 0) {
                            e.style.maxHeight = `calc(3em + ${bottom_height}px)`;
                        }
                    }
                })
                team_d.classList.add('to_drop')

                let options = document.createElement('div');
                options.classList.add('options');

                let drop = document.createElement('button');
                drop.classList.add('drop');

                options.appendChild(drop);

                team_d.appendChild(options);

                // Players
                let bottom = document.createElement('div');
                bottom.classList.add('bottom');

                for (let p in currentViewTournament.teams[team].team_members) {
                    let p_btn = document.createElement('button');
                    console.log(currentViewTournament.teams[team].team_members[p])
                    p_btn.innerText = currentViewTournament.teams[team].team_members[p].first_name + ' ' + currentViewTournament.teams[team].team_members[p].last_name;
                    let params = new URLSearchParams({'search': currentViewTournament.teams[team].team_members[p].first_name + ' ' + currentViewTournament.teams[team].team_members[p].last_name, 'gender': currentViewTournament.teams[team].team_members[p].gender});
                    p_btn.setAttribute('onclick', `
                        window.open("/player-ratings?${params.toString()}")
                    `);
                    bottom.appendChild(p_btn);
                }

                if (currentViewTournament.teams[team].team_members.length == 0) {
                    let span = document.createElement('span');
                    span.innerText = 'No players registered yet';
                    span.style.fontSize = '.8em';
                    bottom.appendChild(span)
                }

                team_d.appendChild(bottom);
            }

            main.appendChild(team_d);
        }

        if (teams_counter == 0) {
            let none = document.createElement('h1');
            none.innerText = 'No Teams';
            none.setAttribute('style', 'margin: 0 auto; font-weight: 400; font-size: 1.3em;');
            main.appendChild(none);
        }

        let tools = document.createElement('div');
        tools.classList.add('tools');

        main.appendChild(tools);
    })

    t_view.appendChild(sites);

    let main_view = document.createElement('div');
    main_view.classList.add('main-view');
    
    t_view.appendChild(main_view);
    
    teams.dispatchEvent(new Event('click'));

}

function viewTeam(t_view) {
    let header = document.createElement('div');
    header.classList.add('header');

    let team_name_string = ''
    for (let i in info.player_teams) {
        if (info.player_teams[i].tournament == currentViewTournament.name) {
            team_name_string = info.player_teams[i].team_name;
            break;
        }
    }

    let team_name = document.createElement('h1');
    team_name.innerText = team_name_string;
    header.appendChild(team_name);

    let name = document.createElement('h2');
    name.innerText = currentViewTournament.name;
    header.appendChild(name);
    name.classList.add('big');

    if (currentViewTournament.venue !== null) {
        let loc = document.createElement('h2');
        loc.innerText = currentViewTournament.venue;
        header.appendChild(loc);
    }

    if (currentViewTournament.begin_date !== null) {
        let date = document.createElement('h2');
        date.innerText = currentViewTournament.begin_date;
        if (currentViewTournament.end_date !== null) {
            date.innerText = currentViewTournament.begin_date + ' - ' + currentViewTournament.end_date;
        }
        header.appendChild(date)
    }

    t_view.appendChild(header);

    let sites = document.createElement('div');
    sites.classList.add('sites');

    
    let teams = document.createElement('button');
    teams.innerText = 'Team';
    sites.appendChild(teams);

    teams.addEventListener('click', (event) => {
        // const urlParams = new URLSearchParams(window.location.search);
        // urlParams.set('path', 'teams');
        // const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        // window.history.pushState({ path: newUrl }, '', newUrl);

        document.querySelectorAll('.page.Tournaments .t-view .sites button').forEach(btn => {
            btn.classList.remove('selected');
        });

        event.target.classList.add('selected');

        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';
        let team_members = [];
        let team = {};
        let team_index = -1;
        for (let i in info.player_teams) {
            if (info.player_teams[i].tournament == currentViewTournament.name) {
                team_index = i;
                team = info.player_teams[i];
                team_members = info.player_teams[i].team_members;
                break;
            }
        }
        
        let teams_counter = 0;
        for (let i in team_members) {
            teams_counter += 1;

            let team_d = document.createElement('div');
            team_d.classList.add('team');

            let team_span = document.createElement('span');
            let player = getPlayer(team_members[i][0]);
            team_span.innerText = player.first_name + ' ' + player.last_name;
            if (team_members[i][1] == 1) {  // Player
                if (team_members[i][2] == 1) {  // Player and Captain
                    team_span.innerText += ' (Captain/Player)';
                } else {  // Just Player
                    team_span.innerText += ' (Player)';
                }
            } else {
                if (team_members[i][2] == 1) { // Just Captain
                    team_span.innerText += ' (Captain)';
                }
            }
            team_d.appendChild(team_span)

            let options = document.createElement('div');
            options.classList.add('options');

            let count = 0;

            let viewPlayer = document.createElement('button');
            viewPlayer.innerText = 'View';
            let params = new URLSearchParams({'search': player.first_name + ' ' + player.last_name, 'gender': player.gender});
            viewPlayer.setAttribute('onclick', `
                window.open("/player-ratings?${params.toString()}")
            `);
            options.appendChild(viewPlayer);
            count += 1;
            
            if (count > 0)
                team_d.appendChild(options);

            main.appendChild(team_d);
        }
    });

    t_view.appendChild(sites);

    let main_view = document.createElement('div');
    main_view.classList.add('main-view');
    
    t_view.appendChild(main_view);
    
    teams.dispatchEvent(new Event('click'));

}

function viewTournament(t_name, loner=false) {
    document.querySelector('.loading').classList.remove('hide');
    currentViewTournament = getTournament(t_name);

    let page = document.querySelector('.page.Tournaments');
    page.innerHTML = '';

    let t_view = document.createElement('div');
    t_view.classList.add('t-view');
    
    let back = document.createElement('button');
    back.innerText = '< Back';
    back.classList.add('back')
    back.addEventListener('click', () => {
        select('Tournaments');
    });

    
    page.appendChild(back);
    page.appendChild(t_view);

    let ttm = playerRegisteredForTournament(currentViewTournament.name);
    
    if (loner) {
        viewLoner(t_name, t_view, false);
    } else if (ttm.tournament_team_id == null) {
        viewLoner(t_name, t_view);
    } else {
        viewTeam(t_view);
    }
    document.querySelector('.loading').classList.add('hide');


}

// function viewTournamentTeams(t_name) {
//     document.querySelector('.loading').classList.remove('hide');
//     currentViewTournament = getTournament(t_name);

//     let page = document.querySelector('.page.Tournaments');
//     page.innerHTML = '';

//     let t_view = document.createElement('div');
//     t_view.classList.add('t-view');
    
//     let back = document.createElement('button');
//     back.innerText = '< Back';
//     back.classList.add('back')
//     back.addEventListener('click', () => {
//         select('Tournaments');
//     });


//     let teams_counter = 0;
//     for (let tm in currentViewTournament.teams) {
//         teams_counter += 1;
//         let team_d = document.createElement('div');
//         team_d.classList.add('team');

//         let team_span = document.createElement('span');
//         team_span.innerText = tm;
//         team_d.appendChild(team_span)

//         // let options = document.createElement('div');
//         // options.classList.add('options');

//         // let send = document.createElement('button');
//         // send.innerText = 'Request';
//         // send.setAttribute('onclick', `sendTeamRequest(event, "${currentViewTournament.name}", "${team}", 1)`);
//         // options.appendChild(send);
        
//         // if (count > 0)
//         //     team_d.appendChild(options);
        
//         t_view.appendChild(team_d)
//     }

    
//     page.appendChild(back);
//     page.appendChild(t_view);

//     document.querySelector('.loading').classList.add('hide');
// }

function manage(t_name, t_manage, action=null) {
    let header = document.createElement('div');
    header.classList.add('header');

    let team_name_string = ''
    for (let i in info.player_teams) {
        if (info.player_teams[i].tournament == currentViewTournament.name) {
            team_name_string = info.player_teams[i].team_name;
            break;
        }
    }

    let team_name = document.createElement('h1');
    team_name.innerText = team_name_string;
    header.appendChild(team_name);

    let name = document.createElement('h2');
    name.innerText = currentViewTournament.name;
    header.appendChild(name);
    name.classList.add('big');

    if (currentViewTournament.venue !== null) {
        let loc = document.createElement('h2');
        loc.innerText = currentViewTournament.venue;
        header.appendChild(loc);
    }

    if (currentViewTournament.begin_date !== null) {
        let date = document.createElement('h2');
        date.innerText = currentViewTournament.begin_date;
        if (currentViewTournament.end_date !== null) {
            date.innerText = currentViewTournament.begin_date + ' - ' + currentViewTournament.end_date;
        }
        header.appendChild(date)
    }

    t_manage.appendChild(header);

    let sites = document.createElement('div');
    sites.classList.add('sites');
    
    // Manage Team
    let manage_team = document.createElement('button');
    manage_team.innerText = 'Manage Team';
    sites.appendChild(manage_team);

    manage_team.addEventListener('click', (event) => {
        document.querySelectorAll('.page.Tournaments .t-view .sites button').forEach(btn => {
            btn.classList.remove('selected');
        });

        event.target.classList.add('selected');
        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';
        let team_members = [];
        let team = {};
        let team_index = -1;
        for (let i in info.player_teams) {
            if (info.player_teams[i].tournament == currentViewTournament.name) {
                team_index = i;
                team = info.player_teams[i];
                team_members = info.player_teams[i].team_members;
                break;
            }
        }
        
        let teams_counter = 0;
        for (let i in team_members) {
            teams_counter += 1;

            let team_d = document.createElement('div');
            team_d.classList.add('team');

            let team_span = document.createElement('span');
            let player = getPlayer(team_members[i][0]);
            team_span.innerText = player.first_name + ' ' + player.last_name;
            if (team_members[i][1] == 1) {  // Player
                if (team_members[i][2] == 1) {  // Player and Captain
                    team_span.innerText += ' (Captain/Player)';
                } else {  // Just Player
                    team_span.innerText += ' (Player)';
                }
            } else {
                if (team_members[i][2] == 1) { // Just Captain
                    team_span.innerText += ' (Captain)';
                }
            }
            team_d.appendChild(team_span)

            let options = document.createElement('div');
            options.classList.add('options');

            let count = 0;

            let cancel = document.createElement('button');
            cancel.innerText = 'Remove';
            cancel.classList.add('cancel');
            cancel.setAttribute('onclick', `removePlayerFromTeam(event, "${currentViewTournament.name}", "${team.team_name}", ${player.profile_id}, ${team_index});`);
            options.appendChild(cancel);
            count += 1;
            
            if (count > 0)
                team_d.appendChild(options);

            main.appendChild(team_d);
        }
    
        let cap = null;
        let cap_index = -1;
        for (let i in info.captain_requests) {
            if (info.captain_requests[i].name === team.team_name && info.captain_requests[i].tournament === currentViewTournament.name) {
                cap = info.captain_requests[i];
                cap_index = i;
            }
        }

        if (cap !== null) {
            for (let i in cap.requests) {
                teams_counter += 1;
                player = getPlayer(cap.requests[i]);

                let team_d = document.createElement('div');
                team_d.classList.add('team');

                let team_span = document.createElement('span');
                team_span.innerText = player.first_name + ' ' + player.last_name;
                team_d.appendChild(team_span);

                let options = document.createElement('div');
                options.classList.add('options');

                let count = 0;

                let accept = document.createElement('button');
                accept.innerText = 'Accept';
                accept.classList.add('accept');
                accept.setAttribute('onclick', `changeRequestStatus(event, ${cap.requests[i]}, ${cap.request_ids[i]}, ${team.tournament_team_id}, ${i}, ${cap_index}, 1, ${team_index})`);
                options.appendChild(accept);
                count += 1;

                let deny = document.createElement('button');
                deny.innerText = 'Deny';
                deny.classList.add('cancel');
                deny.setAttribute('onclick', `changeRequestStatus(event, ${cap.requests[i]}, ${cap.request_ids[i]}, ${team.tournament_team_id}, ${i}, ${cap_index}, 0, ${team_index})`);
                options.appendChild(deny);
                count += 1;
                
                if (count > 0)
                    team_d.appendChild(options);

                main.appendChild(team_d);
            }
        }
    });


    // D1
    let d1 = document.createElement('button');
    d1.innerText = 'D1';
    sites.appendChild(d1);

    d1.addEventListener('click', (event) => {

        document.querySelectorAll('.page.Tournaments .t-view .sites button').forEach(btn => {
            btn.classList.remove('selected');
        });

        event.target.classList.add('selected');

        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';
        let team_members = [];
        let team = {};
        let team_index = -1;
        for (let i in info.player_teams) {
            if (info.player_teams[i].tournament == currentViewTournament.name) {
                team_index = i;
                team = info.player_teams[i];
                team_members = info.player_teams[i].team_members;
                break;
            }
        }

        if (team.sub_teams !== null) {
            for (let s in team.sub_teams) {
                let sub_team_div = document.createElement('div');
                sub_team_div.classList.add('sub-team');

                let ind = document.createElement('h1');
                ind.innerText = 'Team ' + team.sub_teams[s].ind;
                sub_team_div.appendChild(ind);

                let sub_team_players = document.createElement('div');
                
                let males = document.createElement('div');
                let females = document.createElement('div');
                
                let male_title = document.createElement('h2');
                male_title.innerText = 'Males';
                let female_title = document.createElement('h2');
                female_title.innerText = 'Females';

                males.appendChild(male_title);
                females.appendChild(female_title);
                sub_team_players.appendChild(males);
                sub_team_players.appendChild(females);

                let male_players = [];
                let female_players = [];
                for (m in team.sub_teams[s].members) {
                    if (team.sub_teams[s].members[m].gender === 'Male') {
                        male_players.push(team.sub_teams[s].members[m]);
                    } else if (team.sub_teams[s].members[m].gender === 'Female') {
                        female_players.push(team.sub_teams[s].members[m]);
                    }
                }

                
                let btns = [];
                let rm_btns = [];

                let member_counter = 0;

                let m1 = document.createElement('button');
                if (male_players.length > 0) {
                    m1.innerText = male_players[0].first_name + ' ' + male_players[0].last_name;
                    m1.classList.add('delete');
                    m1.addEventListener('click', () => {
                        removePlayerFromSubTeam(team.sub_teams[s].sub_id, male_players[0].profile_id);
                    });
                    member_counter += 1;
                } else {
                    m1.innerText = 'Select Player';
                    btns.push([0, m1]);
                }
                let m2 = document.createElement('button');
                if (male_players.length > 1) {
                    m2.innerText = male_players[1].first_name + ' ' + male_players[1].last_name;
                    m2.classList.add('delete');
                    m2.addEventListener('click', () => {
                        removePlayerFromSubTeam(team.sub_teams[s].sub_id, male_players[1].profile_id);
                    });
                    member_counter += 1;
                } else {
                    m2.innerText = 'Select Player';
                    btns.push([0, m2]);
                }
                let f1 = document.createElement('button');
                if (female_players.length > 0) {
                    f1.innerText = female_players[0].first_name + ' ' + female_players[0].last_name;
                    f1.classList.add('delete');
                    f1.addEventListener('click', () => {
                        removePlayerFromSubTeam(team.sub_teams[s].sub_id, female_players[0].profile_id);
                    });
                    member_counter += 1;
                } else {
                    f1.innerText = 'Select Player';
                    btns.push([1, f1]);
                }
                let f2 = document.createElement('button');
                if (female_players.length > 1) {
                    f2.innerText = female_players[1].first_name + ' ' + female_players[1].last_name;
                    f2.classList.add('delete');
                    f2.addEventListener('click', () => { 
                        removePlayerFromSubTeam(team.sub_teams[s].sub_id, female_players[1].profile_id);
                    });
                    member_counter += 1;
                } else {
                    f2.innerText = 'Select Player';
                    btns.push([1, f2]);
                }

                for (let i in btns) {
                    let btn = btns[i][1];
                    btn.addEventListener('click', event => {
                        document.querySelector('.loading').classList.remove('hide');
                        document.querySelector('.alert-screen').classList.add('show');
                        document.querySelector('.alert-screen .add-player').classList.add('show');

                        let players_div = document.querySelector('.alert-screen .add-player .players');
                        players_div.innerHTML = '';
                        let p_counter = 0;

                        for (let t in team.team_members) {
                            if (team.team_members[t][1] != 1) {
                                continue;
                            }
                            let found = false;
                            for (let st in team.sub_teams) {
                                for (let stm in team.sub_teams[st].members) {
                                    if (team.sub_teams[st].members[stm].profile_id == team.team_members[t][0]) {
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            for (let et in team.event_players) {
                                for (let p in team.event_players[et]) {
                                    if (team.event_players[et][p].profile_id == team.team_members[t][0]) {
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            for (let et in team.event_teams) {
                                for (let etm in team.event_teams[et]) {
                                    if (team.event_teams[et][etm].p1.profile_id == team.team_members[t][0] || team.event_teams[et][etm].p2.profile_id == team.team_members[t][0]) {
                                        found = true;
                                        break;
                                    }
                                }
                            }

                            if (found) {
                                continue;
                            }
                            let pl = getPlayer(team.team_members[t][0]);
                            if ((btns[i][0] == 0 && pl.gender != 'Male') || (btns[i][0] == 1 && pl.gender != 'Female')) {
                                continue;
                            }

                            let p = document.createElement('button');
                            p.classList.add('player');
                            p.innerText = pl.first_name + ' ' + pl.last_name;
                            p.addEventListener('click', async(event) => {
                                addPlayerToSubTeam(team, pl, s);
                            })

                            players_div.appendChild(p);
                            p_counter += 1;
                        }

                        if (p_counter == 0) {
                            let no_p = document.createElement('h1');
                            no_p.innerText = 'No players to add';
                            players_div.appendChild(no_p);
                        }
                        
                        document.querySelector('.loading').classList.add('hide');
                    });
                };

                if (member_counter == 4) {
                    sub_team_div.classList.add('eligible');
                }

                males.appendChild(m1);
                males.appendChild(m2);
                females.appendChild(f1);
                females.appendChild(f2);

                sub_team_div.appendChild(sub_team_players)

                let tools = document.createElement('div');
                tools.classList.add('tools');

                let autofill_btn = document.createElement('button');
                autofill_btn.classList.add('autofill');
                autofill_btn.classList.add('team');
                autofill_btn.innerHTML = 'Auto<br>Fill';
                autofill_btn.addEventListener('click', async(event) => {
                    document.querySelector('.loading').classList.remove('hide');
                    
                    let males_needed = 2;
                    let females_needed = 2;
                    let mn = [];
                    let fn = [];

                    for (let p in team.sub_teams[s].members) {
                        if (team.sub_teams[s].members[p].gender == 'Male') {
                            males_needed -= 1;
                        } else if (team.sub_teams[s].members[p].gender == 'Female') {
                            females_needed -= 1;
                        }
                    }

                    let unavailable_members = [];

                    for (let st in team.sub_teams) {
                        for (let p in team.sub_teams[st].members) {
                            unavailable_members.push(parseInt(team.sub_teams[st].members[p].profile_id))
                        }
                    }

                    for (let et in team.event_players) {
                        for (let p in team.event_players[et]) {
                            unavailable_members.push(parseInt(team.event_players[et][p].profile_id));
                        }
                    }

                    for (let et in team.event_teams) {
                        for (let etm in team.event_teams[et]) {
                            unavailable_members.push(parseInt(team.event_teams[et][etm].p1.profile_id));
                            unavailable_members.push(parseInt(team.event_teams[et][etm].p2.profile_id));
                        }
                    }
                    

                    if (males_needed + females_needed > 0) {
                        for (let m in team.team_members) {
                            if (team.team_members[m][1] == 1 && !unavailable_members.includes(parseInt(team.team_members[m]))) {
                                let p = getPlayer(team.team_members[m][0]);
                                if (males_needed > 0 && p.gender == 'Male') {
                                    mn.push(p);
                                    males_needed -= 1;
                                } else if (females_needed > 0 && p.gender == 'Female') {
                                    fn.push(p);
                                    females_needed -= 1;
                                }
                                if (males_needed + females_needed == 0) {
                                    break;
                                }
                            }
                        }
                    }

                    for (let m in mn) {
                        addPlayerToSubTeam(team, mn[m], s);
                    }

                    for (let f in fn) {
                        addPlayerToSubTeam(team, fn[f], s);
                    }
                    document.querySelector('.loading').classList.add('hide');

                });
                tools.appendChild(autofill_btn);

                let delete_btn = document.createElement('button');
                delete_btn.classList.add('delete');
                delete_btn.classList.add('team');
                delete_btn.innerText = 'Delete Team';
                delete_btn.addEventListener('click', async(event) => {
                    document.querySelector('.loading').classList.remove('hide');
                    let r = await fetch('/api/delete-sub-team', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sub_id: team.sub_teams[s].sub_id
                        })
                    }).then(r => r.json());

                    if (r.success) {
                        let st_ind = team.sub_teams[s].ind;
                        team.sub_teams.splice(s, 1);
                        for (let st in team.sub_teams) {
                            if (team.sub_teams[st].ind > st_ind) {
                                team.sub_teams[st].ind -= 1;
                            }
                        }
                        manageTournament(currentViewTournament.name, 'd1');
                    } else {
                        alert(r.error);
                    }
                    document.querySelector('.loading').classList.add('hide');

                });
                tools.appendChild(delete_btn);

                sub_team_div.appendChild(tools);

                main.appendChild(sub_team_div);
            }
        }

        let addBtn = document.createElement('button');
        addBtn.classList.add('add');
        addBtn.innerText = '+';
        addBtn.addEventListener('click', async(event) => {
            document.querySelector('.loading').classList.remove('hide');
            let r = await fetch('/api/add-sub-team', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    team_name: team.team_name,
                    tournament: team.tournament
                })
            }).then(r => r.json());

            if (r.success) {
                for (i in info.player_teams) {
                    if (info.player_teams[i].tournament_team_id == team.tournament_team_id) {
                        info.player_teams[i].sub_teams.push(r.sub_team);
                        manageTournament(currentViewTournament.name, "d1");
                        document.querySelector('.loading').classList.add('hide');
                        return;
                    }
                }
            } else {
                alert(r.error);
            }
            document.querySelector('.loading').classList.add('hide');
        })
        main.appendChild(addBtn);

    });


    // D2
    let d2 = document.createElement('button');
    d2.innerText = 'D2';
    sites.appendChild(d2);

    d2.addEventListener('click', (event) => {

        document.querySelectorAll('.page.Tournaments .t-view .sites button').forEach(btn => {
            btn.classList.remove('selected');
        });

        event.target.classList.add('selected');

        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';
        let team_members = [];
        let team = {};
        let team_index = -1;
        for (let i in info.player_teams) {
            if (info.player_teams[i].tournament == currentViewTournament.name) {
                team_index = i;
                team = info.player_teams[i];
                team_members = info.player_teams[i].team_members;
                break;
            }
        }
        
        let d2_div = document.createElement('div');
        d2_div.classList.add('D2');
        main.appendChild(d2_div);

        let btns = [];

        for (let et in team.event_players) {
            let event_div = document.createElement('div');
            event_div.classList.add('event');

            let h1 = document.createElement('h1');
            h1.innerText = et;
            event_div.appendChild(h1);

            if (et.toLocaleLowerCase().includes('doubles')) {
                let players_div = document.createElement('div');
                players_div.classList.add('players');
                
                if (team.event_teams[et].length > 0)
                    event_div.appendChild(players_div)

                for (let t in team.event_teams[et]) {
                    let player_button = document.createElement('button');
                    player_button.classList.add('delete');
                    player_button.addEventListener('click', async(event) => {
                        document.querySelector('.loading').classList.remove('hide');
                        let r = await fetch('/api/delete-event-team', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                event_team_id: parseInt(team.event_teams[et][t].event_team_id)
                            })
                        }).then(r => r.json());

                        if (r.success) {
                            for (let pt in info.player_teams) {
                                if (info.player_teams[pt].tournament_team_id == team.tournament_team_id) {
                                    for (let etm in info.player_teams[pt].event_teams[et]) {
                                        if (info.player_teams[pt].event_teams[et][etm].event_team_id == team.event_teams[et][t].event_team_id) {
                                            info.player_teams[pt].event_teams[et].splice(etm, 1);
                                            addPlayerX();
                                            manageTournament(currentViewTournament.name, 'd2');
                                            document.querySelector('.loading').classList.add('hide');
                                            return;
                                        }
                                    }
                                }
                            }
                            addPlayerX();
                            manageTournament(currentViewTournament.name, 'd2');
                        } else {
                            addPlayerX();
                            alert(r.error);
                        }
                        document.querySelector('.loading').classList.add('hide');
                    })
                    player_button.innerText = team.event_teams[et][t].p1.first_name + ' ' + team.event_teams[et][t].p1.last_name + '/' + team.event_teams[et][t].p2.first_name + ' ' + team.event_teams[et][t].p2.last_name;
                    players_div.appendChild(player_button);
                }

                if (team.event_teams[et].length == 0) {
                    let h2 = document.createElement('h2');
                    h2.innerText = 'No Teams'
                    event_div.appendChild(h2);
                }

                let add_player_button = document.createElement('button');
                add_player_button.classList.add('add-player');
                add_player_button.innerText = '+';
                event_div.appendChild(add_player_button);
                if (et.toLocaleLowerCase().includes('women')) {
                    btns.push([0, add_player_button, et]);
                } else if (et.toLocaleLowerCase().includes('men')) {
                    btns.push([1, add_player_button, et]);
                } else {
                    btns.push([2, add_player_button, et]);
                }
            } else {
                let players_div = document.createElement('div');
                players_div.classList.add('players');
                
                if (team.event_players[et].length > 0)
                    event_div.appendChild(players_div)

                for (let p in team.event_players[et]) {
                    let player_button = document.createElement('button');
                    player_button.classList.add('delete');
                    player_button.addEventListener('click', (event) => {
                        deletePlayerFromEvent(team, et, team.event_players[et][p]);
                    })
                    player_button.innerText = team.event_players[et][p].first_name + ' ' + team.event_players[et][p].last_name;
                    players_div.appendChild(player_button);
                }

                if (team.event_players[et].length == 0) {
                    let h2 = document.createElement('h2');
                    h2.innerText = 'No Players'
                    event_div.appendChild(h2);
                }

                let add_player_button = document.createElement('button');
                add_player_button.classList.add('add-player');
                add_player_button.innerText = '+';
                event_div.appendChild(add_player_button);
                if (et.toLocaleLowerCase().includes('women')) {
                    btns.push([0, add_player_button, et]);
                } else if (et.toLocaleLowerCase().includes('men')) {
                    btns.push([1, add_player_button, et]);
                } else {
                    btns.push([2, add_player_button, et]);
                }
            }

            d2_div.appendChild(event_div);
        }

        for (let i in btns) {
            let btn = btns[i][1];
            if (btns[i][2].toLocaleLowerCase().includes('doubles')) {
                btn.addEventListener('click', event => {
                    document.querySelector('.loading').classList.remove('hide');
                    document.querySelector('.alert-screen').classList.add('show');
                    document.querySelector('.alert-screen .add-player').classList.add('show');

                    let players_div = document.querySelector('.alert-screen .add-player .players');
                    players_div.innerHTML = '';

                    let h1_t = document.createElement('h1');
                    h1_t.style.marginBottom = '.5em';
                    if (btns[i][2].toLocaleLowerCase().includes('women')) {
                        h1_t.innerText = 'Female #1';
                    } else {
                        h1_t.innerText = 'Male #1';
                    }
                    players_div.appendChild(h1_t);

                    let p_counter = 0;

                    for (let t in team.team_members) {
                        if (team.team_members[t][1] != 1) {
                            continue;
                        }
                        let found = false;
                        for (let st in team.sub_teams) {
                            for (let stm in team.sub_teams[st].members) {
                                if (team.sub_teams[st].members[stm].profile_id == team.team_members[t][0]) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        for (let p in team.event_players[btns[i][2]]) {
                            if (team.event_players[btns[i][2]][p].profile_id == team.team_members[t][0]) {
                                found = true;
                                break;
                            }
                        }

                        for (let etm in team.event_teams[btns[i][2]]) {
                            if (team.event_teams[btns[i][2]][etm].p1.profile_id == team.team_members[t][0] || team.event_teams[btns[i][2]][etm].p2.profile_id == team.team_members[t][0]) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            continue;
                        }
                        let pl = getPlayer(team.team_members[t][0]);
                        if (btns[i][2].toLocaleLowerCase().includes('women')) {
                            if (pl.gender != 'Female') {
                                continue;
                            }
                        } else if (pl.gender == 'Female') {
                            continue;
                        }

                        let p = document.createElement('button');
                        p.classList.add('player');
                        p.innerText = pl.first_name + ' ' + pl.last_name;
                        p.addEventListener('click', async(event) => {
                            currentD2Player = pl;
                            currentD2TeamInfo = {
                                et: btns[i][2],
                                team: team
                            }
                            players_div.innerHTML = '';

                            let h1_t = document.createElement('h1');
                            h1_t.style.marginBottom = '.5em';
                            if (btns[i][2].toLocaleLowerCase().includes('women') || btns[i][2].toLocaleLowerCase().includes('mixed')) {
                                h1_t.innerText = 'Female #2';
                            } else {
                                h1_t.innerText = 'Male #2';
                            }
                            players_div.appendChild(h1_t);

                            let p_counter = 0;

                            for (let t in team.team_members) {
                                if (team.team_members[t][1] != 1) {
                                    continue;
                                }
                                let found = false;
                                for (let st in team.sub_teams) {
                                    for (let stm in team.sub_teams[st].members) {
                                        if (team.sub_teams[st].members[stm].profile_id == team.team_members[t][0]) {
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                for (let p in team.event_players[btns[i][2]]) {
                                    if (team.event_players[btns[i][2]][p].profile_id == team.team_members[t][0]) {
                                        found = true;
                                        break;
                                    }
                                }
                                for (let etm in team.event_teams[btns[i][2]]) {
                                    if (team.event_teams[btns[i][2]][etm].p1.profile_id == team.team_members[t][0] || team.event_teams[btns[i][2]][etm].p2.profile_id == team.team_members[t][0]) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (currentD2Player.profile_id == team.team_members[t][0]) {
                                    found = true;
                                }
                                if (found) {
                                    continue;
                                }
                                let pl = getPlayer(team.team_members[t][0]);
                                if (btns[i][2].toLocaleLowerCase().includes('women') || btns[i][2].toLocaleLowerCase().includes('mixed')) {
                                    if (pl.gender != 'Female') {
                                        continue;
                                    }
                                } else if (pl.gender == 'Female') {
                                    continue;
                                }

                                let p = document.createElement('button');
                                p.classList.add('player');
                                p.innerText = pl.first_name + ' ' + pl.last_name;
                                p.addEventListener('click', async(event) => {
                                    document.querySelector('.loading').classList.remove('hide');
                                    let r = await fetch('/api/add-event-team', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            et: currentD2TeamInfo.et,
                                            team_id: team.tournament_team_id,
                                            tournament: team.tournament,
                                            p1: currentD2Player.profile_id,
                                            p2: pl.profile_id
                                        })
                                    }).then(r => r.json());

                                    if (r.success) {
                                        for (let pt in info.player_teams) {
                                            if (info.player_teams[pt].tournament_team_id == team.tournament_team_id) {
                                                info.player_teams[pt].event_teams[currentD2TeamInfo.et].push({
                                                    event_team_id: r.id,
                                                    p1: currentD2Player,
                                                    p2: pl
                                                })
                                                break;
                                            }
                                        }
                                        addPlayerX();
                                        manageTournament(currentViewTournament.name, 'd2');
                                    } else {
                                        addPlayerX();
                                        alert(r.error);
                                    }
                                    document.querySelector('.loading').classList.add('hide');
                                })

                                players_div.appendChild(p);
                                p_counter += 1;
                            }

                            if (p_counter == 0) {
                                let no_p = document.createElement('h1');
                                no_p.innerText = 'No players to add';
                                players_div.appendChild(no_p);
                            }
                            
                            document.querySelector('.loading').classList.add('hide');
                        })

                        players_div.appendChild(p);
                        p_counter += 1;
                    }

                    if (p_counter == 0) {
                        let no_p = document.createElement('h1');
                        no_p.innerText = 'No players to add';
                        players_div.appendChild(no_p);
                    }
                    
                    document.querySelector('.loading').classList.add('hide');
                });
            } else {
                btn.addEventListener('click', event => {
                    document.querySelector('.loading').classList.remove('hide');
                    document.querySelector('.alert-screen').classList.add('show');
                    document.querySelector('.alert-screen .add-player').classList.add('show');
    
                    let players_div = document.querySelector('.alert-screen .add-player .players');
                    players_div.innerHTML = '';
                    let p_counter = 0;
    
                    for (let t in team.team_members) {
                        if (team.team_members[t][1] != 1) {
                            continue;
                        }
                        let found = false;
                        for (let st in team.sub_teams) {
                            for (let stm in team.sub_teams[st].members) {
                                if (team.sub_teams[st].members[stm].profile_id == team.team_members[t][0]) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        for (let p in team.event_players[btns[i][2]]) {
                            if (team.event_players[btns[i][2]][p].profile_id == team.team_members[t][0]) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            continue;
                        }
                        let pl = getPlayer(team.team_members[t][0]);
                        if ((btns[i][0] == 1 && pl.gender != 'Male') || (btns[i][0] == 0 && pl.gender != 'Female')) {
                            continue;
                        }
    
                        let p = document.createElement('button');
                        p.classList.add('player');
                        p.innerText = pl.first_name + ' ' + pl.last_name;
                        p.addEventListener('click', async(event) => {
                            addPlayerToEvent(team, btns[i][2], pl);
                        })
    
                        players_div.appendChild(p);
                        p_counter += 1;
                    }
    
                    if (p_counter == 0) {
                        let no_p = document.createElement('h1');
                        no_p.innerText = 'No players to add';
                        players_div.appendChild(no_p);
                    }
                    
                    document.querySelector('.loading').classList.add('hide');
                });
            }
        };

    });

    t_manage.appendChild(sites);

    let main_view = document.createElement('div');
    main_view.classList.add('main-view');
    
    t_manage.appendChild(main_view);
    
    if (action == 'd1') {
        d1.dispatchEvent(new Event('click'));
    } else if (action == 'd2') {
        d2.dispatchEvent(new Event('click'));
    } else {
        manage_team.dispatchEvent(new Event('click'));
    }
}

function manageTournament(t_name, action=null) {
    document.querySelector('.loading').classList.remove('hide');
    currentViewTournament = getTournament(t_name);

    let ttm = playerRegisteredForTournament(currentViewTournament.name);
    if (ttm.captain == 0) {
        return;
    }

    currentViewTournament = getTournament(t_name);

    let page = document.querySelector('.page.Tournaments');
    page.innerHTML = '';

    let t_manage = document.createElement('div');
    t_manage.classList.add('t-view');

    let back = document.createElement('button');
    back.innerText = '< Back';
    back.classList.add('back')
    back.addEventListener('click', () => {
        select('Tournaments');
    });
    
    page.appendChild(back);
    page.appendChild(t_manage);

    if (ttm.captain == 1) {
        manage(t_name, t_manage, action);
    }
    document.querySelector('.loading').classList.add('hide');
}

async function select(p) {

    document.querySelectorAll('.stuff .items button').forEach(btn => {
        if (btn.innerText.trimEnd() === p.replace('-', ' ')) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    let page = document.querySelector('.page');
    page.innerHTML = '';

    removeAllClasses(page);
    page.classList.add('page');

    p = p.replace(' ', '-');
    page.classList.add(p);

    if (info === null) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('view', p);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    if (p === 'Dashboard') {
        let name_div = document.createElement('div');

        let name = document.createElement('h1');
        name.innerHTML = info.player.first_name + ' ' + info.player.last_name;
        name.classList.add('name');
        name_div.appendChild(name);
        delete name;

        if (info.player['college'] !== null) {
            let college = document.createElement('h6');
            college.innerHTML = info.player.college;
            college.classList.add('college');
            name_div.appendChild(college);
            delete college;
        }

        page.appendChild(name_div);

        let stat_container = document.createElement('div');
        stat_container.classList.add('stat-container');

        let overall = null;
        if ('overall' in info.player)
            overall = (info.player.overall == -100 ? 'UR': (info.player.overall < 0 ? `(${info.player.overall + 99})` : info.player.overall));
            if (overall != 'UR') {
                overall = overall.toFixed(2);
            }

        let singles_rating = info.player.singles_games_played >= 5 ? info.player.singles_rating : `(${info.player.singles_rating})`;
        let doubles_rating = info.player.doubles_games_played >= 5 ? info.player.doubles_rating : `(${info.player.doubles_rating})`;
        let mixed_doubles_rating = info.player.mixed_doubles_games_played >= 5 ? info.player.mixed_doubles_rating : `(${info.player.mixed_doubles_rating})`;

        // Gender Ranking
        try {
            stat_container.appendChild(createStatDiv('Gender Rank', info.player.ranking))
        } catch {
            ;
        }

        // Overall
        try {
            if (overall !== null) {
                stat_container.appendChild(createStatDiv('Overall', overall))
            }
        } catch {
            ;
        }

        // Singles Rating
        try {
            stat_container.appendChild(createStatDiv('Singles', singles_rating));
        } catch {
            ;
        }

        // Doubles Rating
        try {
            stat_container.appendChild(createStatDiv('Doubles', doubles_rating));
        } catch {
            ;
        }

        // Mixed Rating
        try {
            stat_container.appendChild(createStatDiv('Mixed', mixed_doubles_rating));
        } catch {
            ;
        }

        page.appendChild(stat_container);

        let past_matches_div = document.createElement('div');
        past_matches_div.classList.add('past-matches');

        let h1 = document.createElement('h1');
        h1.innerText = 'Past Matches';
        past_matches_div.appendChild(h1);

        let inner = document.createElement('div');
        inner.classList.add('inner');
        
        info.past_matches.forEach(match => {
            let m = document.createElement('div');
            let match_type = document.createElement('h3');
            match_type.innerText = match.team_type;

            m.appendChild(match_type);
            t1 = [];
            t2 = [];

            if (typeof(match.profile_ids_t1) == 'string')
                match.profile_ids_t1 = match.profile_ids_t1.split(',');
            if (typeof(match.profile_ids_t2) == 'string')
                match.profile_ids_t2 = match.profile_ids_t2.split(',');

            for (let id = 0; id < match.profile_ids_t1.length; id++) {
                t1.push(getPlayer(match.profile_ids_t1[id]));
            }
            for (let id = 0; id < match.profile_ids_t2.length; id++) {
                t2.push(getPlayer(match.profile_ids_t2[id]));
            }

            if (match.profile_ids_t1.includes(info.player.profile_id.toString())) {
                if (match.t2score > match.t1score) {
                    m.classList.add('loss');
                } else {
                    m.classList.add('win');
                }
            }
            if (match.profile_ids_t2.includes(info.player.profile_id.toString())) {
                if (match.t1score > match.t2score) {
                    m.classList.add('loss');
                } else {
                    m.classList.add('win');
                }
            }

            let cover = document.createElement('div');
            cover.classList.add('cover');
            m.appendChild(cover);

            let scores_div = document.createElement('div');
            scores_div.classList.add('scores-div');

            let score1 = document.createElement('div');
            score1.classList.add('score');

            let h4 = document.createElement('h4');
            for (p in t1) {
                if (p == 0) {
                    h4.innerText += t1[p].first_name + ' ' + t1[p].last_name;
                } else {
                    h4.innerText += ' / ' + t1[p].first_name + ' ' + t1[p].last_name;
                }
            }
            
            score1.appendChild(h4);

            team1score = document.createElement('h2');
            team1score.innerText = match.t1score;
            score1.appendChild(team1score);

            scores_div.appendChild(score1);

            let vs = document.createElement('h4');
            vs.innerText = 'VS'
            scores_div.appendChild(vs);

            let score2 = document.createElement('div');
            score2.classList.add('score');

            h4 = document.createElement('h4');
            for (p in t2) {
                if (p == 0) {
                    h4.innerText += t2[p].first_name + ' ' + t2[p].last_name;
                } else {
                    h4.innerText += ' / ' + t2[p].first_name + ' ' + t2[p].last_name;
                }
            }
            
            score2.appendChild(h4);

            
            team2score = document.createElement('h2');
            team2score.innerText = match.t2score;
            score2.appendChild(team2score);

            
            scores_div.appendChild(score2);

            // vs = document.createElement('h2');
            // vs.innerHTML = `${match.t1score} <span style="font-weight: 400;">-</span> ${match.t2score}`;
            // m.appendChild(vs);
            m.appendChild(scores_div);
            inner.appendChild(m);
        })

        if (info.past_matches.length == 0) {
            let nom = document.createElement('h2');
            nom.innerText = 'No matches found'
            inner.appendChild(nom);
            inner.style.height = '80%';
            past_matches_div.style.height = '100%';
        } else if (info.past_matches.length == 6) {
            let div = document.createElement('div');
            div.style.backgroundColor = 'transparent';
            div.style.height = 'auto';
            div.style.width = '100%';
            let view_all = document.createElement('button');
            view_all.innerText = 'View all matches'
            view_all.addEventListener('click', event => {
                select('Matches')
            })
            div.appendChild(view_all);
            inner.appendChild(div)
        }
        
        past_matches_div.appendChild(inner);

        page.appendChild(past_matches_div);

    } else if (p === 'Account-Info') {
        edits = {
            'first_name': 'First Name',
            'last_name': 'Last Name',
            'email': 'Email',
            'phone_number': 'Phone Number',
        };

        for (edit in edits) {
            let div = document.createElement('div');
            div.classList.add('editable');

            let title = document.createElement('h1');
            title.innerText = edits[edit];

            let input = document.createElement('input');
            input.classList.add(edit);

            input.addEventListener('input', async(event) => {
                let d = event.target.parentElement;
                let buttons = d.querySelectorAll('button');
                if (event.target.value !== '') {
                    buttons[0].classList.add('reset');
                    buttons[1].classList.add('save');
                } else {
                    buttons[0].setAttribute('class', '');
                    buttons[1].setAttribute('class', '');
                }
            });

            input.setAttribute('placeholder', info.player[edit]);

            let options = document.createElement('div');
            let reset = document.createElement('button');
            reset.innerText = 'RESET';
            reset.addEventListener('click', event => {
                if (event.target.classList.contains('reset')) {
                    let inp = event.target.parentElement.parentElement.querySelector('input');
                    inp.value = '';
                    let buttons = event.target.parentElement.parentElement.querySelectorAll('button');
                    buttons[0].setAttribute('class', '');
                    buttons[1].setAttribute('class', '');
                }
            })
            let save = document.createElement('button');
            save.addEventListener('click', async(event) => {
                if (event.target.classList.contains('save')) {
                    let inp = event.target.parentElement.parentElement.querySelector('input');
                    let val = inp.value;
                    let to_set = inp.getAttribute('class');
                    if (to_set == 'first_name') {
                        if (val.length == 0) {
                            return alert('Please enter a valid first name');
                        } else if (val.length > 30) {
                            return alert('First names can not be over 30 characters. If your name is longer please enter a shortened version')
                        }
                    } else if (to_set == 'last_name') {
                        if (val.length == 0) {
                            return alert('Please enter a valid last name');
                        } else if (val.length > 30) {
                            return alert('Last names can not be over 30 characters. If your name is longer please enter a shortened version')
                        }
                    } else if (to_set == 'email') {
                        if (val.length == 0 || !val.includes('@')) {
                            return alert('Please enter a valid email');
                        } else if (val.length > 70) {
                            return alert('Emails can not be over 70 characters. Please use a different email');
                        }
                    } else if (to_set == 'phone_number') {
                        val = extractNums(val);
                        if (isNaN(val) || val.length != 10) {
                            return alert('Please enter a valid phone number');
                        }
                    } else {
                        return;
                    }

                    let con = confirm(`Are you sure you want to change your ${inp.parentElement.querySelector('h1').innerText.toLowerCase().trimEnd()} from ${inp.getAttribute('placeholder')} to ${val}`)
                    if (!con) {
                        return;
                    }
                    
                    let body = {};
                    body[to_set] = val;
                    let r = await fetch('/api/edit-profile', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    }).then(res => res.json());

                    if (r.success === true) {
                        info.player[to_set] = val;
                        inp.setAttribute('placeholder', val);
                        let update_string = `Updated your ${inp.parentElement.querySelector('h1').innerText.toLowerCase().trimEnd()} to ${val}`;
                        alert(update_string);
                    } else {
                        alert(r.error);
                    }
                }
            })
            save.innerText = 'SAVE';

            options.appendChild(reset);
            options.appendChild(save);

            div.appendChild(title);
            div.appendChild(input);
            div.appendChild(options);
            page.appendChild(div);
        }

        if (info.player.singles_games_played + info.player.doubles_games_played + info.player.mixed_doubles_games_played == 0) {
            let div = document.createElement('div');
            div.classList.add('editable');

            let title = document.createElement('h1');
            title.innerText = 'Connect Key'

            let input = document.createElement('input');
            input.classList.add('connect')

            div.appendChild(title);
            div.appendChild(input);

            let options = document.createElement('div');
            let save = document.createElement('button');
            save.classList.add('connect')
            save.addEventListener('click', async(event) => {
                let connect_key = document.querySelector('input.connect').value;
                let r = await fetch('/connect-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        connect_key: connect_key
                    })
                }).then(r => r.json());

                if (r.success) {
                    alert('Connected');
                    location.reload();
                } else {
                    alert(r.error)
                }
            })
            save.innerText = 'Connect';

            options.appendChild(save);
            div.appendChild(options);
            
            page.appendChild(div);
        }

    } else if (p === 'Tournaments') {

        let list = document.createElement('div');
        list.classList.add('List');
        list.classList.add('show');

        
        let h1 = document.createElement('h1');
        h1.innerText = 'Tournaments';

        list.appendChild(h1);

        let dd = document.createElement('div');
        dd.classList.add('date-div');

        date_cats = ['Current', 'Upcoming', 'Past'];
        counts = []
        for (i in date_cats) {
            let d = document.createElement('div');
            counts[i] = tournaments[date_cats[i].toLocaleLowerCase()].length;
            if (i == 0 && counts[i] > 0) {
                d.classList.add('selected');
            } else if(i == 1 && counts[0] == 0 && counts[1] > 0) {
                d.classList.add('selected');
            } else if(i == 2 && counts[0] == 0 && counts[1] == 0) {
                d.classList.add('selected');
            }
            h1 = document.createElement('h1');
            d.setAttribute('onclick', 'selectDate(event)');
            h1.setAttribute('onclick', 'selectDate(event, true)');
            h1.innerText = date_cats[i];
            d.appendChild(h1);
            
            dd.appendChild(d);
        }

        list.appendChild(dd);

        let tournament_container = document.createElement('div');
        tournament_container.classList.add('tournament-container');

        list.appendChild(tournament_container);

        page.appendChild(list);

        selectD();
    } else if (p === 'Matches') {
        let iframe = document.createElement('iframe');
        iframe.setAttribute('src', '/profile-matches.html');

        page.appendChild(iframe);
    } else {
        ;
    }
}


// Helper functions
function removeAllClasses(element) {
    while (element.classList.length > 0) {
        element.classList.remove(element.classList.item(0));
    }
}


// Event Listeners


document.querySelector('.signout-btn').addEventListener('click', async(event) => {
    let r = await fetch('/signout').then(res => res.json());
    if (r.success === true) {
        location.href = '/';
    } else {
        alert('Something went wrong');
    }
})

function clickedPage() {
    document.querySelector('.main').classList.add('slid-over');
}

function unClickedPage() {
    document.querySelector('.main').classList.remove('slid-over');
}

document.querySelector('.page').addEventListener('click', event => {
    clickedPage();
})

let menuXY = 0;

document.querySelector('body').addEventListener('touchstart', event => {
    menuXY = event.changedTouches[0].screenX;
})

document.querySelector('body').addEventListener('touchmove', event => {
    if ((menuXY - event.changedTouches[0].screenX) > 50) {
        clickedPage();
    } else if ((menuXY - event.changedTouches[0].screenX) < -50) {
        unClickedPage();
    }
})















