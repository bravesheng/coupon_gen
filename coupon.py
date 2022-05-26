start_sn = 0
end_sn = 0
random_len = 0
random_code_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

def random_char(code_length):
    import random
    result_str = ''
    for x in range(code_length):
        result_str += random.choice(random_code_list)
    return result_str

class Coupon():
    coupon_code = None
    date_of_use = None
    owner = None
    expiry_date = None
    notes = None
    def __init__(self, coupon_code, date_of_use, owner, expiry_date, notes):
        self.coupon_code = coupon_code
        self.date_of_use = date_of_use
        self.owner = owner
        self.expiry_date = expiry_date
        self.notes = notes
    def use_this_coupon(self):
        import datetime
        date_of_use = datetime.date.today()
    def status(self):
        if self.date_of_use == None:
            return "尚未使用"
        return "已使用"

from gsheet import GoogleSheetTools

class CouponTable():
    def __init__(self):
        self.col_id = {"流水編號":0, "符號":1, "驗證碼":2, "兌換日期":3, "客戶代號":4, "使用期限":5, "抵用額度":6}
        self.mysheet = GoogleSheetTools()
        self.rows = self.mysheet.get_data()

    def __find_last_serial_number(self):
        last_row = self.rows[len(self.rows)-1]
        return last_row[0]

    def find_coupon_by_code(self, code):
        if self.rows:
            for x in self.rows:
                if x[self.col_id["流水編號"]] == code:
                    result = Coupon(x[self.col_id["流水編號"]]+x[self.col_id["符號"]]+x[self.col_id["驗證碼"]],x[self.col_id["兌換日期"]],x[self.col_id["客戶代號"]],x[self.col_id["使用期限"]],x[self.col_id["抵用額度"]])
                    return result
        return None
    def append(self):
        new_sn = int(self.__find_last_serial_number())+1
        value_range_body = {"values": [[new_sn, '-', random_char(3), '', '新資料', '2023/12/31', '可抵用主商品100元租金']]}
        self.mysheet.append(value_range_body)
 
def main():
    table = CouponTable()
    print(table.find_coupon_by_code("9747"))

if __name__ == '__main__':
    main()