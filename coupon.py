start_sn = 0
end_sn = 0
random_len = 0
random_code_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
output_file_name = 'coupon.txt'

def random_char(code_length):
    import random
    result_str = ''
    for x in range(code_length):
        result_str += random.choice(random_code_list)
    return result_str

import sys
arg = sys.argv

if len(arg) <= 1:
    print('\nA tool to generate coupon serial code and random code.')
    print('Usage: coupon.py [start_sn] [end_sn] [random_len]')
    print('\t[start_sn] the coupon\'s serial number start from.')
    print('\t[end_sn] the coupon\'s serial number end.')
    print('\t[random_len] the length of the ramdom string, Max length is 10.')
    print('\n')
    exit()
else:
    try:
        start_sn = int(arg[1])
        end_sn = int(arg[2]) + 1
        random_len = int(arg[3])
        if start_sn > end_sn - 1:
            raise Exception('start s/n larger than end s/n.')
        if(random_len > 10):
            raise Exception('ramdom code length too long.')
    except Exception as e:
        print('wrong arguments.' , e)
        exit()

f=open(output_file_name,'w')
for x in range(start_sn,end_sn):
    f.write(str(x) + '\t-\t' + random_char(random_len) + '\n')
f.close()
print('data already output to [%s] ,please check.' % (output_file_name))
