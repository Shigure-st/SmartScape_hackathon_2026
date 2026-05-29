stat = []
with open('.stat', 'r') as f:
    for line in f:
        stat.append(line.split(':')[1].strip())
print(stat)
