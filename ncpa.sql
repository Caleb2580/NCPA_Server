DROP DATABASE NCPA;
CREATE DATABASE NCPA;

USE NCPA;

CREATE TABLE Profile (
    profile_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL,
    college VARCHAR(100),
    email VARCHAR(70) UNIQUE,
    pass VARCHAR(100),
    phone_number VARCHAR(10) UNIQUE,
    gender VARCHAR(20),
    division INT,
    birthday DATE,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    singles_rating DOUBLE(4, 2) DEFAULT 4.5,
    doubles_rating DOUBLE(4, 2) DEFAULT 4.5,
    mixed_doubles_rating DOUBLE(4, 2) DEFAULT 4.5,
    singles_games_played INT DEFAULT 0,
    doubles_games_played INT DEFAULT 0,
    mixed_doubles_games_played INT DEFAULT 0,
    connect_key VARCHAR(20),
    permission INT DEFAULT 0
);

CREATE TABLE TeamType (
    name VARCHAR(30) PRIMARY KEY,
    id INT UNIQUE NOT NULL
);

CREATE TABLE Tournament (
    name VARCHAR(100) PRIMARY KEY UNIQUE,
    max_points INT DEFAULT 0,
    venue VARCHAR(200),
    venue_address VARCHAR(200),
    registration_open DATE,
    registration_close DATE,
    begin_date DATE,
    end_date DATE,
    description VARCHAR(3000),
    multiplier DOUBLE DEFAULT 1,
    registration_price DOUBLE
);

CREATE TABLE TournamentTeam (
    tournament_team_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200),
    points DOUBLE(8, 5),
    placement INT,
    tournament VARCHAR(200),
    captain_key VARCHAR(20),
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    UNIQUE (name, tournament)
);

CREATE TABLE TournamentSubTeam (
    sub_id INT PRIMARY KEY AUTO_INCREMENT,
    ind INT,
    points DOUBLE(8, 5),
    placement INT,
    tournament VARCHAR(200),
    team_name VARCHAR(200),
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    FOREIGN KEY (team_name) REFERENCES TournamentTeam(name) ON DELETE CASCADE,
    INDEX (ind)
);

CREATE TRIGGER trg_before_insert_tournament_sub_team
BEFORE INSERT ON TournamentSubTeam
FOR EACH ROW
BEGIN
    DECLARE max_ind INT;

    -- Find the current maximum ind for the same team_name and tournament
    SELECT IFNULL(MAX(ind), 0) INTO max_ind
    FROM TournamentSubTeam
    WHERE team_name = NEW.team_name AND tournament = NEW.tournament;

    -- Set the ind value for the new row
    SET NEW.ind = max_ind + 1;
END;


CREATE PROCEDURE ReindexSubTeams(IN p_team_name VARCHAR(200), IN p_tournament VARCHAR(200))
BEGIN
    -- Initialize the row number
    SET @row_number = 0;

    -- Update the table with new indices
    UPDATE TournamentSubTeam
    JOIN (
        SELECT sub_id, 
               @row_number := @row_number + 1 AS new_ind
        FROM TournamentSubTeam
        WHERE team_name = p_team_name
          AND tournament = p_tournament
        ORDER BY ind
    ) AS sub_team_updates
    ON TournamentSubTeam.sub_id = sub_team_updates.sub_id
    SET TournamentSubTeam.ind = sub_team_updates.new_ind;
END;

CREATE TABLE TournamentSubTeamMember (
    sub_member_id INT PRIMARY KEY AUTO_INCREMENT,
    sub_id INT,
    tournament VARCHAR(200) NOT NULL,
    profile_id INT NOT NULL,
    gender VARCHAR(6) NOT NULL,
    FOREIGN KEY (sub_id) REFERENCES TournamentSubTeam(sub_id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    UNIQUE(profile_id, sub_id)
);

CREATE TABLE TournamentEventTeam (
    event_team_id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_team_id INT,
    tournament VARCHAR(200) NOT NULL,
    p1 INT,
    p2 INT,
    event VARCHAR(20),
    FOREIGN KEY (tournament_team_id) REFERENCES TournamentTeam(tournament_team_id) ON DELETE CASCADE,
    FOREIGN KEY (p1) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (p2) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    FOREIGN KEY (event) REFERENCES TeamType(name) ON DELETE CASCADE,
    UNIQUE(p1, event, tournament),
    UNIQUE(p2, event, tournament)
);

CREATE TABLE TournamentEventPlayer (
    event_player_id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_team_id INT,
    tournament VARCHAR(200) NOT NULL,
    profile_id INT NOT NULL,
    event VARCHAR(20),
    FOREIGN KEY (tournament_team_id) REFERENCES TournamentTeam(tournament_team_id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    FOREIGN KEY (event) REFERENCES TeamType(name) ON DELETE CASCADE,
    UNIQUE(profile_id, tournament, event)
);

CREATE TABLE MatchTeam (
    match_team_id INT PRIMARY KEY AUTO_INCREMENT,
    team_name VARCHAR(200),
    ind INT,
    FOREIGN KEY (team_name) REFERENCES TournamentTeam(name) ON DELETE SET NULL,
    FOREIGN KEY (ind) REFERENCES TournamentSubTeam(ind) ON DELETE SET NULL
);

CREATE TABLE `Match` (
    match_id INT PRIMARY KEY AUTO_INCREMENT,
    t1_id INT,
    t2_id INT,
    t1score INT,
    t2score INT,
    affect_rating BOOLEAN NOT NULL,
    time DATETIME,
    team_type VARCHAR(30) NOT NULL,
    tournament VARCHAR(200),
    FOREIGN KEY (team_type) REFERENCES TeamType(name) ON DELETE CASCADE,
    FOREIGN KEY (t1_id) REFERENCES MatchTeam(match_team_id) ON DELETE CASCADE,
    FOREIGN KEY (t2_id) REFERENCES MatchTeam(match_team_id) ON DELETE SET NULL,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE SET NULL
);

CREATE TABLE MatchTeamPlayer (
    match_team_profile_id INT PRIMARY KEY AUTO_INCREMENT,
    profile_id INT,
    team_id INT,
    FOREIGN KEY (profile_id) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES MatchTeam(match_team_id) ON DELETE CASCADE
);

CREATE TABLE Court (
    court_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    tournament VARCHAR(200) NOT NULL,
    match_id INT,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES `Match`(match_id) ON DELETE CASCADE,
    UNIQUE(name, tournament)
);

CREATE TABLE College (
    name VARCHAR(100) PRIMARY KEY,
    ranking INT
);

CREATE TABLE TournamentTeamRequest (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    profile_id INT NOT NULL,
    tournament_team VARCHAR(200) NOT NULL,
    tournament VARCHAR(200) NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_team) REFERENCES TournamentTeam(name) ON DELETE CASCADE,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    UNIQUE(profile_id, tournament)
);

CREATE TABLE TournamentTeamMember (
    tournament_team_member_id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_team_id INT,
    tournament VARCHAR(200) NOT NULL,
    profile_id INT NOT NULL,
    captain BOOLEAN DEFAULT 0,
    player BOOLEAN DEFAULT 0,
    stripe_session_id VARCHAR(100),
    FOREIGN KEY (profile_id) REFERENCES Profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_team_id) REFERENCES TournamentTeam(tournament_team_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament) REFERENCES Tournament(name) ON DELETE CASCADE,
    UNIQUE(profile_id, tournament_team_id),
    UNIQUE(profile_id, tournament)
);

CREATE TABLE Log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT
);
