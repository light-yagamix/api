const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const SES_CONFIG = {
  // credentials: {
  //   accessKeyId: process.env.sesKeyId,
  //   secretAccessKey: process.env.sesAccessKey,
  // },
  region: process.env.sesRegion,
};

const sesClient = new SESClient(SES_CONFIG);

 
async function SendEmail(recipient, subject, message, type) {
  const params = {
    Source: process.env.sesEmail,
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Body: {
        Html: {
          Data: type === "otp" ? otpTemplate(message) : message,
        },
      },
      Subject: {
        Data: subject,
      },
    },
  };
  try {
    await sesClient.send(new SendEmailCommand(params));
    // await sendOTP(recipient, message);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports.SendEmail = SendEmail;

const otpTemplate = (
  otp
) => `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
 
 
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting"> 
  <title></title>
  
    <style type="text/css">
      table, td { color: #000000; } a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_image_1 .v-src-width { width: 600px !important; } #u_content_image_1 .v-src-max-width { max-width: 60% !important; } #u_content_image_4 .v-src-width { width: 500px !important; } #u_content_image_4 .v-src-max-width { max-width: 80% !important; } #u_content_menu_1 .v-container-padding-padding { padding: 26px 10px 10px !important; } #u_content_menu_1 .v-layout-display { display: block !important; } #u_content_menu_1 .v-padding { padding: 5px 14px !important; } }
@media only screen and (min-width: 570px) {
  .u-row {
    width: 550px !important;
  }
  .u-row .u-col {
    vertical-align: top;
  }

  .u-row .u-col-100 {
    width: 550px !important;
  }

}

@media (max-width: 570px) {
  .u-row-container {
    max-width: 100% !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
  }
  .u-row .u-col {
    min-width: 320px !important;
    max-width: 100% !important;
    display: block !important;
  }
  .u-row {
    width: calc(100% - 40px) !important;
  }
  .u-col {
    width: 100% !important;
  }
  .u-col > div {
    margin: 0 auto;
  }
}
body {
  margin: 0;
  padding: 0;
}

table,
tr,
td {
  vertical-align: top;
  border-collapse: collapse;
}

p {
  margin: 0;
}

.ie-container table,
.mso-container table {
  table-layout: fixed;
}

* {
  line-height: inherit;
}

a[x-apple-data-detectors='true'] {
  color: inherit !important;
  text-decoration: none !important;
}

@media (max-width: 480px) {
  .hide-mobile {
    max-height: 0px;
    overflow: hidden;
    display: none !important;
  }

}
    </style>
  
  

 
</head>

<body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #ffffff;color: #000000">
 
  <table style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #ffffff;width:100%" cellpadding="0" cellspacing="0">
  <tbody>
  <tr style="vertical-align: top">
    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
  
 


<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 550px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
    <div style="border-collapse: collapse;display: table;width: 100%;background-image: url('https://cdn.templates.unlayer.com/assets/1636376675254-sdsdsd.png');background-repeat: no-repeat;background-position: center top;background-color: transparent;">
  
 <div class="u-col u-col-100" style="max-width: 320px;min-width: 550px;display: table-cell;vertical-align: top;">
  <div style="width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
  
<table id="u_content_image_4" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:50px 10px 25px;font-family:arial,helvetica,sans-serif;" align="left">
        
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tbody><tr>
    <td style="padding-right: 0px;padding-left: 0px;" align="center">
      
      <img align="center" border="0" src="https://cdn.templates.unlayer.com/assets/1636374086763-hero.png" alt="Hero Image" title="Hero Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 54%;max-width: 286.2px;" width="286.2" class="v-src-width v-src-max-width">
      
    </td>
  </tr>
</tbody></table>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 20px 5px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <h2 style="margin: 0px; color: #141414; line-height: 140%; text-align: center; word-wrap: break-word; font-weight: normal; font-family: 'Open Sans',sans-serif; font-size: 28px;">
    <strong>Here Is Your One Time Password</strong>
  </h2>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div style="color: #a7a5a5; line-height: 140%; text-align: center; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 140%;"><strong><span style="font-family: Lato, sans-serif; font-size: 14px; line-height: 19.6px;"> Verify your account to continue.  </span></strong></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:15px 10px 12px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <h1 style="margin: 0px; color: #3b4d63; line-height: 140%; text-align: center; word-wrap: break-word; font-weight: normal; font-family: arial,helvetica,sans-serif; font-size: 41px;">
    <strong>
    ${otp
      .split("")
      .map((item) => {
        return `<span style="text-decoration: underline;">${item}</span>`;
      })
      .join("")}
    </strong>
  </h1>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 117px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div style="color: #0081ff; line-height: 140%; text-align: center; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;"><strong><span style="font-family: Lato, sans-serif; line-height: 25.2px; font-size: 18px;">Valid For 15 minutes Only!</span></strong></span></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>
 
  </div>
</div> 
    </div>
  </div>
</div>



<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 550px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #000000;">
    <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
 <div class="u-col u-col-100" style="max-width: 320px;min-width: 550px;display: table-cell;vertical-align: top;">
  <div style="width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
 
<table id="u_content_menu_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:40px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
        
<div class="menu" style="text-align:center"> 
  
    <a href="https://unlayer.com" target="_self" style="padding:5px 16px;display:inline-block;color:#a3b2c3;font-family:'Open Sans',sans-serif;font-size:15px;text-decoration:none" class="v-padding v-layout-display">
      FAQs&nbsp;
    </a>
   
    <span style="padding:5px 16px;display:inline-block;color:#5f6d7e;font-family:'Open Sans',sans-serif;font-size:15px" class="v-padding hide-mobile">
      |
    </span> 
  
    <a href="https://unlayer.com" target="_self" style="padding:5px 16px;display:inline-block;color:#a3b2c3;font-family:'Open Sans',sans-serif;font-size:15px;text-decoration:none" class="v-padding v-layout-display">
      Terms &amp; Condition
    </a>
   
    <span style="padding:5px 16px;display:inline-block;color:#5f6d7e;font-family:'Open Sans',sans-serif;font-size:15px" class="v-padding hide-mobile">
      |
    </span> 
  
    <a href="https://unlayer.com" target="_self" style="padding:5px 16px;display:inline-block;color:#a3b2c3;font-family:'Open Sans',sans-serif;font-size:15px;text-decoration:none" class="v-padding v-layout-display">
      Contact Us
    </a>
   
</div>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="83%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #443e3e;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
    <tbody>
      <tr style="vertical-align: top">
        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
          <span>&nbsp;</span>
        </td>
      </tr>
    </tbody>
  </table>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
<div align="center">
  <div style="display: table; max-width:179px;"> 
    <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 13px">
      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
        <a href="https://twitter.com/" title="Twitter" target="_blank">
          <img src="https://cdn.tools.unlayer.com/social/icons/circle-black/twitter.png" alt="Twitter" title="Twitter" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
        </a>
      </td></tr>
    </tbody></table> 
    <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 13px">
      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
        <a href="https://linkedin.com/" title="LinkedIn" target="_blank">
          <img src="https://cdn.tools.unlayer.com/social/icons/circle-black/linkedin.png" alt="LinkedIn" title="LinkedIn" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
        </a>
      </td></tr>
    </tbody></table> 
    <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 13px">
      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
        <a href="https://instagram.com/" title="Instagram" target="_blank">
          <img src="https://cdn.tools.unlayer.com/social/icons/circle-black/instagram.png" alt="Instagram" title="Instagram" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
        </a>
      </td></tr>
    </tbody></table> 
    <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 0px">
      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
        <a href="https://meetup.com/" title="Meetup" target="_blank">
          <img src="https://cdn.tools.unlayer.com/social/icons/circle-black/meetup.png" alt="Meetup" title="Meetup" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
        </a>
      </td></tr>
    </tbody></table> 
  </div>
</div>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 20px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div style="color: #a3b2c3; line-height: 140%; text-align: center; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 140%;"><span style="font-family: Lato, sans-serif; font-size: 14px; line-height: 19.6px;">If you have questions regarding your Data, please visit our <span style="text-decoration: underline; font-size: 14px; line-height: 19.6px;">Privacy Policy</span></span></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>
 
  </div>
</div> 
    </div>
  </div>
</div>

 
    </td>
  </tr>
  </tbody>
  </table> 



</body></html>`;