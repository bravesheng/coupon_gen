FROM python:slim

WORKDIR /app

ADD . /app

RUN pip install -r requirements.txt

CMD python web_flask.py

EXPOSE 5000