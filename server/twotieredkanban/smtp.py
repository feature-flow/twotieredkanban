import smtplib
from email.mime.text import MIMEText

def sendmail(from_, host, port=0, user=None, password=None, tls=None):
    port = int(port)

    def sendmail(to_addr, subject, body):
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = from_
        msg['To'] = to_addr
        s = smtplib.SMTP('email-smtp.us-east-1.amazonaws.com', port)
        if tls:
            s.starttls()
        if user:
            s.login(user, password)
        s.send_message(msg)
        s.quit()

    return sendmail
