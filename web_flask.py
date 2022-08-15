# save this as app.py
from flask import Flask, render_template, request
from datetime import datetime
import coupon

app = Flask(__name__)
g_coupon_table = coupon.CouponTable()

@app.route("/")
def hello():
    now = datetime.now()
    return render_template('hello.html', **locals())

@app.route('/find_coupon', methods=['POST'])
def find_coupon():
    global g_coupon_table
    find_text = request.values['find_text']
    result = g_coupon_table.find_coupon_by_sn(find_text)
    if result == None:
        return 'no data match.'
    return render_template('find_coupon.html', **locals())

@app.route('/coupon_action', methods=['POST'])
def coupon_action():
    action = request.values['action']
    if action == 'Use Coupon':
        global g_coupon_table
        couopn_code = request.values['coupon_code']
        result = g_coupon_table.find_coupon_by_sn(couopn_code)
        result.use_this_coupon()
        g_coupon_table.update_coupon(result)
        return render_template('find_coupon.html', **locals())

if __name__ == '__main__':
    app.debug = True
    app.run()

