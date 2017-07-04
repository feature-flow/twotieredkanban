import boto.ses

def sendmail(from_addr, region='us-east-1'):
    conn = boto.ses.connect_to_region(region)
    def sendmail(to_addr, subject, body):
        conn.send_email(from_addr, subject, body, [to_addr])
    return sendmail
