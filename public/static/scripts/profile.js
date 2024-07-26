info = null;
players = [];
let tournaments = {};
let player_teams = [];
let currentViewTournament = {};


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
                    ts[type][q]['team_names'] = ts['teams'][i]['team_names'].split(' ;; ');
                    broke = true;
                    break;
                }
            }
            if (broke)
                break;
        }
        for (let r in ts['requests']) {
            console.log(r);
        }
    }

    for (let i in ts['requests']) {
        console.log(ts['requests'][i])
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
    players = await getPlayers();
    tournaments = await getTournaments();

    let new_player = await getPlayer(info.player.profile_id);
    for (key in new_player) {
        if (!(key in info.player)) {
            info.player[key] = new_player[key];
        }
    }

    info.past_matches.forEach(match => {
        if (typeof(match.profile_ids_t1) == 'string')
            match.profile_ids_t1 = match.profile_ids_t1.split(',');
        if (typeof(match.profile_ids_t2) == 'string')
            match.profile_ids_t2 = match.profile_ids_t2.split(',');
    });

    info.player_teams.forEach(pt => {
        pt.team_members = pt.team_members.split(',');
        for (let t in pt.team_members) {
            pt.team_members[t] = pt.team_members[t].split(':');
        }
    })

    
    for (let i in info.captain_requests) {
        info.captain_requests[i].requests = info.captain_requests[i].requests.split(',');
        info.captain_requests[i].request_ids = info.captain_requests[i].request_ids.split(',');
    }

    if (!setup) {
        document.querySelector('.loading').classList.add('hide');
    }
}

async function setup() {

    document.querySelector('.loading').classList.remove('hide');

    let r = await fetch('/me').then(res => res.json()).catch(err => {
        location.href = '/login';
    });
    if (r.success === true) {
        info = r.info;
    } else {
        location.href = '/login';
        return;
    }

    await setupGrabs(true);

    if (info.player.permission == 5) {
        let admin_btn = document.createElement('button');
        admin_btn.innerText = 'Admin';
        admin_btn.setAttribute('onclick', 'location.href = "/admin";')
        document.querySelector('.items').appendChild(admin_btn);
    }

    await select('Tournaments');
    // select('Account Info');

    
    document.querySelector('.loading').classList.add('hide');
}

setup();


async function menuSelect(event) {
    document.querySelector('.items button.selected').classList.remove('selected');
    
    event.target.classList.add('selected');
    
    select(event.target.innerText);
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
    let type = document.querySelector('.date-div div.selected').innerText.toLowerCase();
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
                    console.log(tournaments[type][i].registration_open)

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
                            document.querySelector('.alert-screen .register').setAttribute('id', "reg_${tournaments[type][i].name}")
                        `);
                        
                        tools.appendChild(register);
                        tool_counter += 1;
                    }
                }
            } else {
                if (player_tournament.player == 1) {
                    let view = document.createElement('button');
                    view.innerText = 'View';
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
                        register.innerText = 'Register';
                    }
                    register.setAttribute('onclick', `
                        document.querySelector('.alert-screen').classList.add('show');
                        document.querySelector('.alert-screen .register').setAttribute('id', "reg_${tournaments[type][i].name}")
                    `);
                    
                    tools.appendChild(register);
                    tool_counter += 1;
                }
            }
            if (tool_counter > 0)
                t.appendChild(tools);
            
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
        if (pid != info.player.profile_id) {
            manageTournament(currentViewTournament.name);
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
        manageTournament(currentViewTournament.name);
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

function viewLoner(t_name, t_view) {
    
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
        let main = document.querySelector('.page.Tournaments .t-view .main-view');
        main.innerHTML = '';

        let teams_counter = 0;

        
        console.log(currentViewTournament)

        currentViewTournament.team_names.forEach(team => {
            teams_counter += 1;
            let team_d = document.createElement('div');
            team_d.classList.add('team');

            let team_span = document.createElement('span');
            team_span.innerText = team;
            team_d.appendChild(team_span)

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

            main.appendChild(team_d);
        })

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

function viewTournament(t_name) {
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
    
    if (ttm.tournament_team_id == null) {
        viewLoner(t_name, t_view);
    }


}

function manage(t_name, t_manage) {
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

    t_manage.appendChild(header);

    let sites = document.createElement('div');
    sites.classList.add('sites');
    
    let team = document.createElement('button');
    team.innerText = 'Manage Team';
    sites.appendChild(team);

    team.addEventListener('click', (event) => {
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

    t_manage.appendChild(sites);

    let main_view = document.createElement('div');
    main_view.classList.add('main-view');
    
    t_manage.appendChild(main_view);
    
    team.dispatchEvent(new Event('click'));
}

function manageTournament(t_name) {

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
        manage(t_name, t_manage);
    }
}

async function select(p) {
    let page = document.querySelector('.page');
    page.innerHTML = '';

    removeAllClasses(page);
    page.classList.add('page');

    p = p.replace(' ', '-');
    page.classList.add(p);

    if (info === null) {
        return;
    }

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


            let h4 = document.createElement('h4');
            for (p in t1) {
                if (p == 0) {
                    h4.innerText += t1[p].first_name + ' ' + t1[p].last_name;
                } else {
                    h4.innerText += ' / ' + t1[p].first_name + ' ' + t1[p].last_name;
                }
            }
            
            m.appendChild(h4);

            let vs = document.createElement('h4');
            vs.innerHTML = `<span style="font-weight: 400;">VS</span>`;
            m.appendChild(vs);

            h4 = document.createElement('h4');
            for (p in t2) {
                if (p == 0) {
                    h4.innerText += t2[p].first_name + ' ' + t2[p].last_name;
                } else {
                    h4.innerText += ' / ' + t2[p].first_name + ' ' + t2[p].last_name;
                }
            }
            
            m.appendChild(h4);

            vs = document.createElement('h2');
            vs.innerHTML = `${match.t1score} <span style="font-weight: 400;">-</span> ${match.t2score}`;
            m.appendChild(vs);

            inner.appendChild(m);
        })

        if (info.past_matches.length == 0) {
            let nom = document.createElement('h2');
            nom.innerText = 'No matches found'
            inner.appendChild(nom);
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

                    let con = confirm(`Are you sure you want to change your ${inp.parentElement.querySelector('h1').innerText.toLowerCase()} from ${inp.getAttribute('placeholder')} to ${val}`)
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
                        let update_string = `Updated your ${inp.parentElement.querySelector('h1').innerText.toLowerCase()} to ${val}`;
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
        for (i in date_cats) {
            let d = document.createElement('div');
            if (date_cats[i] == 'Current') {
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
        // let inner = `
        //     <div class="loading hide">
        //         <div class="ring">Loading
        //             <span></span>
        //         </div>
        //     </div>

        //     <div class="main-container">
        //         <div class="main">
        //             <style>
        //                 @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        //                 h2.powered {
        //                     font-weight: 400;
        //                     font-size: 1em;
        //                     position: absolute;
        //                     top: 0;
        //                     right: 0;
        //                     margin: 0;
        //                     margin-top: .15em;
        //                     padding: 0;
        //                     text-align: right;
        //                 }

        //                 .back-btn {
        //                     display: none;
        //                     margin: 0;
        //                     padding: 0;
        //                 }

        //                 .back-btn.show {
        //                     display: block;
        //                 }

        //                 .gender-div {
        //                     border-radius: 2em;
        //                     margin: 0;
        //                     display: flex;
        //                     justify-content: space-around;
        //                     align-items: center;
        //                     flex-direction: row;
        //                     background-color: rgb(250, 250, 250);
        //                     width: 300px;
        //                     padding: 0;
        //                     overflow: hidden;
        //                 }

        //                 .gender-div div {
        //                     display: flex;
        //                     justify-content: center;
        //                     align-items: center;
        //                     padding: 0;
        //                     margin: 0;
        //                     width: 100%;
        //                     height: 100%;
        //                 }

        //                 .gender-div div h1 {
        //                     font-size: .7em;
        //                     padding: 1em;
        //                     color: rgb(10, 10, 10);
        //                     margin: 0;
        //                     cursor: pointer;
        //                 }

        //                 .gender-div div.selected {
        //                     background-color: rgb(126, 173, 237);
        //                 }

        //                 .gender-div div.selected h1 {
        //                     color: rgb(250, 250, 250);
        //                 }

        //                 @media screen and (max-width: 600px) {
        //                     h2.powered {
        //                         font-size: .9em;
        //                         margin-top: .35em;
        //                     }

        //                     .gender-div {
        //                         width: 200px;
        //                     }
        //                 }

        //                 @media screen and (max-width: 500px) {
        //                     h2.powered {
        //                         font-size: .8em;
        //                         margin-top: .5em;
        //                     }
        //                 }

        //                 @media screen and (max-width: 350px) {
        //                     h2.powered {
        //                         margin-top: .35em;
        //                         font-size: .65em;
        //                     }
        //                 }
        //             </style>
        //             <h2 class="powered">Powered by <span style="font-family: 'Space Mono'; font-weight: 700; color: rgb(0, 0, 130); cursor: pointer;" onclick="window.open('https\://vitalit.solutions');"><span style="text-decoration: underline;">V</span>italIT <span style="text-decoration: underline;"">S</span>olutions</span></h2>
        //             <h1 class="college show">PLAYERS</h1>
        //             <h2 class="college"></h2>
        //             <div class="search-div">
        //                 <input type="text" placeholder="Search">
        //                 <button class="search" onclick="search();"><img src="/images/search.png" alt=""></button>
        //                 <button class="x-btn" onclick="document.querySelector('.search-div input').value = ''; search();">&#x2716;</button>
        //             </div>
        //             <div class="gender-div">
        //                 <div onclick="selectGender(event, false)" class="selected" id="gender-male"><h1 onclick="selectGender(event, true)">Male</h1></div>
        //                 <div onclick="selectGender(event, false)"><h1 onclick="selectGender(event, true)">Female</h1></div>
        //                 <!-- <div onclick="selectGender(event, false)" id="gender-all"><h1 onclick="selectGender(event, true)">All</h1></div> -->
        //             </div>
        //             <div>
        //                 <select name="" id="" class="sort">
        //                     <!-- <option value="first_name1">Ranking</option> -->
        //                 </select>
        //             </div>
        //             <div class="column-additions">
        //             </div>
        //             <div class="container">
        //                 <table class="player-table">
                            
        //                 </table>
        //             </div>
        //             <p>Note: () around a rating indicate that a player isn't fully eligible, as they haven't played enough matches in all match types. You must play 5 games in a specific match type to become eligible in that match type.<br>**Click on a college to view more details**</p>
        //             <div class="refresh-div">
        //                 <button onclick="setup();">REFRESH</button>
        //             </div>
        //         </div>
        //     </div>
        // `;

        // page.innerHTML = inner;
    
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
















