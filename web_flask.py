# save this as app.py
from this import d
from flask import Flask, render_template, request
from datetime import datetime
import coupon

app = Flask(__name__)
g_coupon_table = None

@app.route("/")
def hello():
    return render_template('hello.html', **locals())

@app.route('/find_coupon', methods=['POST'])
def find_coupon():
    global g_coupon_table
    if(g_coupon_table == None):
        g_coupon_table = coupon.CouponTable()
    find_text = request.values['find_text']
    result = g_coupon_table.find_coupon_by_sn(find_text)
    if result == None:
        return render_template('hello.html', **locals())
    return render_template('find_coupon.html', **locals())

@app.route('/coupon_action', methods=['POST'])
def coupon_action():
    result = g_coupon_table.find_coupon_by_sn(request.values['coupon_code'])
    action = request.values['action']
    if action == 'Use Coupon':
        result.use_this_coupon()
        g_coupon_table.update_coupon(result)
        return render_template('find_coupon.html', **locals())
    elif action == 'Update':
        result.set_owner(request.values['owner'])
        result.set_date_of_use(request.values['date_of_use'])
        result.set_expiry_date(request.values['expiry_date'])
        result.set_notes(request.values['notes'])
        g_coupon_table.update_coupon(result)
        return render_template('find_coupon.html', **locals())

@app.route('/generate_new')
def generate_new():
    result = g_coupon_table.generate_new_coupon()
    return render_template('find_coupon.html', **locals())


if __name__ == '__main__':
    #app.run(debug=True)
    app.run(debug=True, host='0.0.0.0', port=5000)