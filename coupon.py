random_code_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
CP_COUPON_CODE = 0
CP_DATE_OF_USE = 1
CP_OWNER = 2
CP_EXPIRY_DATE = 3
CP_NOTES = 4
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
        self.date_of_use:date = None
        self.expiry_date:date = None
        if type(date_of_use) is date:
            self.date_of_use = date_of_use
        elif type(date_of_use) is str and date_of_use != '':
            self.date_of_use = date.fromisoformat(date_of_use)
        self.owner = owner
        if type(expiry_date) is date:
            self.expiry_date = expiry_date
        elif type(date_of_use) is str and expiry_date != '':
            self.expiry_date = date.fromisoformat(expiry_date)
        self.notes = notes
    
    def strft_date_of_use(self):
        if self.date_of_use:
            return self.date_of_use.strftime("%Y-%m-%d")
        return ''
    def strft_expiry_date(self):
        if self.expiry_date:
            return self.expiry_date.strftime("%Y-%m-%d")
        return ''
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
                if y[CP_COUPON_CODE] == sn:
                    result = Coupon(x, y[CP_COUPON_CODE],y[CP_DATE_OF_USE],y[CP_OWNER],y[CP_EXPIRY_DATE],y[CP_NOTES])
                    return result
        return None

    def update_coupon(self, coupon:Coupon):
        value_range_body = {"values": [[coupon.coupon_code, '', '', coupon.date_of_use, coupon.owner, coupon.expiry_date, coupon.notes]]}
        self.mysheet.update_data('R['+str(coupon.row_idx)+']', value_range_body)

    def generate_new_coupon(self):
        last_code = self.__find_last_coupon_code()
        last_number = last_code[0:4]
        new_sn = int(last_number)+1
        new_code = str(new_sn) + random_char(3)
        new_coupon = Coupon(0, new_code, '', None, date.today() + timedelta(days=365),'')
        return new_coupon

    def append_coupon(self, coupon:Coupon):
        value_range_body = {"values": [[coupon.coupon_code, coupon.strft_date_of_use(), coupon.owner, coupon.strft_expiry_date(), coupon.notes]]}
        self.mysheet.append(value_range_body)
 
def main():
    table = CouponTable()
    old_coupon = table.find_coupon_by_sn("9746MOP")
    new_coupon = table.generate_new_coupon()
    table.append_coupon(old_coupon)


if __name__ == '__main__':
    main()