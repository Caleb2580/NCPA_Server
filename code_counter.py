import os


exclusions = [
    'package-lock.json',
    'package.json',
    'schema.sql',
    'ncpa_players.json',
    'ncpa_matches.json',
    'matches.json',
    'app copy.js',
    'app copy 2.js',
    'images',
    'node_modules',
    'demos',
    'ncpa.json',
    'ncpa2.json',
    'ncpa3.json',
    'players.json',
    'player_list.txt',
    'players',
    'index.html'
    '2024 National Collegiate Pickleball Championship.json',
    'htmls.json',
    'index.html',
    'copy',
    '.git'
]


def get_file_info(fp, info):
    f = open(fp, 'r').read()
    f = f.split('\n')
    info['lines'] += len(f)
    info['characters'] += len(''.join(f))
    info['files'].append({'filepath': fp, 'lines': len(f), 'characters': len(''.join(f))})


def get_files(dir, info = {
        'lines': 0,
        'characters': 0,
        'files': []
    }):
    global exclusions
    for d in os.listdir(dir):
        if d not in exclusions and d[-5:] != '.json' and d[-4:] != '.txt' and ' copy' not in d:
            if '.' in d:
                get_file_info(dir + d, info)
            else:
                get_files(dir + d + '\\', info)
    return info



info = get_files(os.getcwd() + '\\')
info['words'] = int(info['characters'] / 5)

for f in info['files']:
    print(f)

print('----------------')
print(f'Total number of files: {len(info["files"])}')
print(f'Total lines: {info["lines"]}')
print(f'Total characters: {info["characters"]}')
print(f'Total words (Average of 5 characters per word): {info["words"]}')

print(f"\nThe average person type 40 words per minute. This means it would take {info['words']/40/60:.1f} hours of constant typing to write the code alone. This excludes the problem solving process, all of the error checking/fixing, learning process, and rewritten code.")








