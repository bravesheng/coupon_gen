# save this as app.py
from flask import Flask, render_template, request
from datetime import datetime
import coupon

app = Flask(__name__)
g_coupon_table = None

@app.route("/")
def hello():
    now = datetime.now()
    return render_template('hello.html', **locals())

@app.route('/find_coupon', methods=['POST'])
def find_coupon():
    global g_coupon_table
    if(g_coupon_table == None):
        g_coupon_table = coupon.CouponTable()
    find_text = request.values['find_text']
    result = g_coupon_table.find_coupon_by_code(find_text)
    if result == None:
        return 'no data match.'
    return render_template('find_coupon.html', **locals())

if __name__ == '__main__':
    app.run()

