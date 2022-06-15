start_sn = 0
end_sn = 0
random_len = 0
random_code_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
col_id = {"折扣碼":0, "兌換日期":1, "客戶代號":2, "使用期限":3, "備註":4}
SPREADSHEET_ID = '1hPciz779MX8IEUdYxtTDNkwTNN0YFod-3JZbJWJirlU'
RANGE_NAME = 'DEBUG!A:E'
from gsheet import GoogleSheetTools
from datetime import timedelta, date

def random_char(code_length):
    import random
    result_str = ''
    for x in range(code_length):
        result_str += random.choice(random_code_list)
    return result_str

class Coupon():
    def __init__(self, row_idx, coupon_code, date_of_use, owner, expiry_date, notes):
        self.row_idx = row_idx #record the order related to google sheets
        self.coupon_code = coupon_code
        self.date_of_use = date_of_use
        self.owner = owner
        self.expiry_date = expiry_date
        self.notes = notes
        if len(self.date_of_use) <= 0:
            self.status = '未使用'
        else:
            self.status = '已使用'

    def use_this_coupon(self):
        import datetime
        date_of_use = datetime.date.today()

class CouponTable():
    def __init__(self):
        self.mysheet = GoogleSheetTools(SPREADSHEET_ID, RANGE_NAME)
        self.rows = self.mysheet.get_data()

    def __find_last_coupon_code(self):
        last_row = self.rows[len(self.rows)-1]
        return last_row[0]

    def find_coupon_by_sn(self, sn):
        if self.rows:
            for x in range(1, len(self.rows)):
                y = self.rows[x]
                if y[self.col_id["流水編號"]] == sn:
                    result = Coupon(x, y[self.col_id["流水編號"]]+y[self.col_id["驗證碼"]],y[self.col_id["兌換日期"]],y[self.col_id["客戶代號"]],y[self.col_id["使用期限"]],y[self.col_id["備註"]])
                    return result
        return None

    def update_coupon(self, coupon:Coupon):
        print(coupon.coupon_code)
        value_range_body = {"values": [[coupon.coupon_code, '', '', coupon.date_of_use, coupon.owner, coupon.expiry_date, coupon.notes]]}
        self.mysheet.update_data('R['+str(coupon.row_idx)+']', value_range_body)

    def generate_new_coupon(self):
        last_code = self.__find_last_coupon_code()
        last_number = last_code[0:4]
        new_sn = int(last_number)+1
        new_code = str(new_sn) + random_char(3)
        new_coupon = Coupon(0, new_code, '', '', date.today() + timedelta(days=365),'')
        return new_coupon

    def append(self):
        last_code = self.__find_last_coupon_code()
        last_number = last_code[0:4]
        new_sn = int(last_number)+1
        new_code = str(new_sn) + random_char(3)
        value_range_body = {"values": [[new_code, '','', '2023-12-31', '可抵用主商品100元租金']]}
        self.mysheet.append(value_range_body)
 
def main():
    table = CouponTable()
    table.append()


if __name__ == '__main__':
    main()