//get target
let inputConfig = input.config();
let target_record_id = inputConfig['target_record_id'];

//get tables
let table_forms = base.getTable('External Form');
let table_contacts = base.getTable("Contacts")
let table_services = base.getTable("Services")
let table_projects = base.getTable("Projects")
let table_properties = base.getTable("Property Name")
let table_clients = base.getTable("Clients")
let table_project_requests = base.getTable("Project Requests")
let table_admin_emails_sent = base.getTable("Admin Emails Sent")

//get records
let records_form_raw = await table_forms.selectRecordsAsync()
let records_form = records_form_raw.records
let records_contacts_raw = await table_contacts.selectRecordsAsync()
let records_contacts = records_contacts_raw.records
let records_services_raw = await table_services.selectRecordsAsync()
let records_services = records_services_raw.records
let records_projects_raw = await table_projects.selectRecordsAsync()
let records_projects = records_projects_raw.records
let records_properties_raw = await table_properties.selectRecordsAsync()
let records_properties = records_properties_raw.records
let records_clients_raw = await table_clients.selectRecordsAsync()
let records_clients = records_clients_raw.records
let records_project_requests_raw = await table_project_requests.selectRecordsAsync()
let records_project_requests = records_project_requests_raw.records
let records_admin_emails_sent_raw = await table_admin_emails_sent.selectRecordsAsync()
let records_admin_emails_sent = records_admin_emails_sent_raw.records

//get target record
let target_record = records_form.filter(record => record.id == target_record_id)[0]



//find company (if not existing create one)
let all_variables = {}
if (target_record.getCellValue("Existing Client?") == null) {
   let company_record = await table_clients.createRecordsAsync([{fields:{
                                                      "Company": target_record.getCellValue("Company Name"),
                                                      "Address": target_record.getCellValue("Company Address"),
                                                      "URL": clean_url(target_record.getCellValue("Company Website URL")),
                                                      "Status" : {name : "Active"}
                                                   }}
                                          ])
                        await table_contacts.createRecordsAsync([{fields:{
                                                                           "Name": target_record.getCellValue("Company Contact Name"),
                                                                           "Surname": target_record.getCellValue("Company Contact Surname"),
                                                                           "Email": target_record.getCellValue("Company Contact Email"),
                                                                           "Phone": target_record.getCellValue("Company Contact Phone Number"),
                                                                           "Clients" : [{id : company_record[0]}]
                                                                        }}
                                                               ])
   let company_record_id = company_record[0]
   all_variables['company_record_id']= company_record_id
}
else {
    //iterate through all clients and try to match with target record from url provided in target record
   for (let client_index in records_clients) {
      if (target_record.getCellValue("Company Website URL").includes(records_clients[client_index].getCellValue("URL"))) {
         all_variables['company_record_id'] = records_clients[client_index].id
      }
   }

   //check if we actually found a company record, if not set the record in External Form error
   if ('company_record_id' in all_variables) {
      //
   }
   else {
      await table_forms.updateRecordAsync(target_record_id, {
         "Error?": true,
      })
      await table_admin_emails_sent.createRecordsAsync([{fields:{
                                                                  "Subject": 'External Form Error',
                                                                  "Content": 'User inputted the website name of his company wrong while filling out the form. Check the records with errors at this link: https://airtable.com/shrxkeLAW6oYoY7SW',
                                                                  "Recipient": 'alessio.monino@gmail.com'
                                                               }}
                                                         ])
   }
}



//find property (if not existing create one)
if ('company_record_id' in all_variables) {
   if (target_record.getCellValue("Existing Property?") == null) {
      let property_record = await table_properties.createRecordsAsync([{fields:{
                                                         "Property Name": target_record.getCellValue("Property Name"),
                                                         "Billing Name": target_record.getCellValue("Property Billing Name"),
                                                         "Property Billing Email": target_record.getCellValue("Property Billing Email"),
                                                         "Billing Address": target_record.getCellValue("Property Address"),
                                                         "URL": clean_url(target_record.getCellValue("Property Website URL")),
                                                         'Client': [{id : all_variables['company_record_id']}]
                                                      }}
                                             ])
      
      let property_record_id = property_record[0]
      all_variables['property_record_id']= property_record_id
   }
   else {
      //iterate through all properties and try to match with target record from url provided in target record
      for (let property_index in records_properties) {
         if (target_record.getCellValue("Property Website URL").includes(records_properties[property_index].getCellValue("URL"))) {
            all_variables['property_record_id'] = records_properties[property_index].id
         }
      }

       //check if we actually found a property record, if not set the record in External Form error
      if ('company_record_id' in all_variables) {
         //
      }
      else {
         await table_forms.updateRecordAsync(target_record_id, { //flag record as with error
            "Error?": true,
         })
         await table_admin_emails_sent.createRecordsAsync([{fields:{
                                                                  "Subject": 'External Form Error',
                                                                  "Content": 'User inputted the website name of his property wrong while filling out the form. Check the records with errors at this link: https://airtable.com/shrxkeLAW6oYoY7SW',
                                                                  "Recipient": 'alessio.monino@gmail.com'
                                                               }}
                                                         ])
      }
   }
}



//create project
if ('company_record_id' in all_variables && 'property_record_id' in all_variables) {
   if (target_record.getCellValue("Service Requested") != null) {

      //find default team member for requested service
      let service_record = records_services.filter(record => record.id == target_record.getCellValue("Service Requested")[0]['id'])[0]
      let team_member_id = service_record.getCellValue("Default Team Member")[0]['id']

      //create main project field values
      let staging_style_name = target_record.getCellValue('Staging Style') != null ? {name : target_record.getCellValue('Staging Style')['name']} : null
      let submitting_invoices_method = target_record.getCellValue('How will we submit invoices?') != null ? {name : target_record.getCellValue('How will we submit invoices?')['name']} : null
      let fields_values = {fields:{
                           "Property Name": [{id : all_variables['property_record_id']}],
                           "Service": [{id : target_record.getCellValue("Service Requested")[0]['id']}],
                           "Number of Units": target_record.getCellValue("Number of Units"),
                           "Team Member" : [{id : team_member_id}],
                           'Upload Architectural Plans' : target_record.getCellValue('Upload Architectural Plans'),
                           'Upload Reference Photos' : target_record.getCellValue('Upload Reference Photos'),
                           'Upload Photos' : target_record.getCellValue('Upload Photos'),
                           'Staging Style' : staging_style_name,
                           'How will we submit invoices?' : submitting_invoices_method
                        }}

      //See project attributes
      console.log(fields_values)

      await table_project_requests.createRecordsAsync([fields_values])
   }
}



//cleaning url function
function clean_url(url) {
   if (url != null) {
      url = url.replace('https://www.','')
      url = url.replace('http://www.','')
      url = url.replace('//www.','')
      url = url.replace('www.','')
      url = url.replace('ww.','')
      url = url.replace('w.','')
      return url
   }
   else {
      return null
   }
}
