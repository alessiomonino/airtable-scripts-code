
const config = input.config()
let target_record_id = config['target_record_id']

//get all tables
let table_partners = base.getTable('WL/Ref Partners');
let table_active_accounts = base.getTable('Active Accounts - Commissions');
let table_sales_reps = base.getTable('Sales Reps');
let table_invoices = base.getTable('Invoices');
let table_commissions = base.getTable('Commissions');
let table_products = base.getTable('Products Purchased');

//import variables
let INBOUND_STARTING_COMMISSION = 500
let OUTBOUND_STARTING_COMMISSION = 1000
let REFERRAL_STARTING_COMMISSION = 500
let WHITE_LABEL_STARTING_COMMISSION = 500

let OUTBOUND_COMMISSION_PERCENTAGE =0.03
let INBOUND_COMMISSION_PERCENTAGE =0.03
let REFERRAL_PARTNER_COMMISSION = 0.03 * 0.9
let WHITE_LABEL_COMMISSION_PERCENTAGE =0.03

let OUTBOUND_LAST_INVOICES_COMMISSION = 36
let INBOUND_LAST_INVOICE_COMMISSION = 36
let REFERRAL_LAST_INVOICE_COMMISSION = 36
let WHITE_LABEL_LAST_INVOICE_COMMISSION = 36

let OUTBOUND_INVOICES_BEFORE_STARTING_COMMISSION = 3
let INBOUND_INVOICES_BEFORE_STARTING_COMMISSION = 3
let REFERRAL_INVOICES_BEFORE_STARTING_COMMISSION = 3
let WHITE_LABEL_INVOICES_NOT_FIRST_CLIENT_BEFORE_COMMISSION = 1
let WHITE_LABEL_INVOICES_BEFORE_STARTING_COMMISSION = 3

let AUDIT_DIMINISHED_PERCENTAGE = 0.5
let DAYS_IN_MONTH = 30

//get records from all tables
let records_active_accounts_raw = await table_active_accounts.selectRecordsAsync()
let records_active_accounts = records_active_accounts_raw.records
let records_commissions_raw = await table_commissions.selectRecordsAsync()
let records_commissions = records_commissions_raw.records
let records_sales_reps_raw = await table_sales_reps.selectRecordsAsync()
let records_sales_reps = records_sales_reps_raw.records
let records_products_raw = await table_products.selectRecordsAsync()
let records_products = records_products_raw.records
let records_partners_raw = await table_partners.selectRecordsAsync()
let records_partners = records_partners_raw.records
let records_invoices_raw = await table_invoices.selectRecordsAsync()
let records_invoices = records_invoices_raw.records

//get target record
let invoice = records_invoices.filter(record => record.id == target_record_id)[0]


//array of all new commission
let all_new_commissions = []

//array all products upated
let all_products = []

//get all audits
let all_signed_in_audit_accounts = records_products.filter(record => record.getCellValue("Commission Created?") == null
                                                            && record.getCellValue("Service") != null
                                                            && record.getCellValue("Service")[0]['name'] == 'Audit'
                                                            && record.getCellValue("Sales Rep")[0]['name'] != 'Kasim Aslam'
                                                            && record.getCellValue("Sales Rep")[0]['name'] != 'John Moran')
console.log("Signed In Accounts to Process")
console.log(all_signed_in_audit_accounts)



for (let account in all_signed_in_audit_accounts) {
   let time_from_creation = all_signed_in_audit_accounts[account].getCellValue('Days Since Born')
   if (time_from_creation < DAYS_IN_MONTH && all_signed_in_audit_accounts[account].getCellValue("Signed On?") != null && all_signed_in_audit_accounts[account].getCellValue("Signed On?")['name'] == 'Yes') {
      // all_new_commissions.push({ 
      //                      fields : {
      //                         'Products' : [{id:all_signed_in_audit_accounts[account].id}],
      //                         'Price' : all_signed_in_audit_accounts[account].getCellValue("Audit Fee"),
      //                         "Company" : all_signed_in_audit_accounts[account].getCellValue("Company Name"),
      //                         "Status" : {name:'Pending'},
      //                         "Sales Rep" : [{id:all_signed_in_audit_accounts[account].getCellValue("Sales Rep")[0]['id']}],
      //                         "Days Since Born" : all_signed_in_audit_accounts[account].getCellValue("Days Since Born")
      //                      }})
      // all_products.push({id: all_signed_in_audit_accounts[account].id, fields : {
      //                "Commission Created?" : true
      //             }})
   }
   else if (time_from_creation >= DAYS_IN_MONTH) { 
      all_new_commissions.push({ 
                           fields : {
                              'Products' : [{id:all_signed_in_audit_accounts[account].id}],
                              'Price' : all_signed_in_audit_accounts[account].getCellValue("Audit Fee") * AUDIT_DIMINISHED_PERCENTAGE,
                              "Company" : all_signed_in_audit_accounts[account].getCellValue("Company Name"),
                              "Status" : {name:'Pending'},
                              "Sales Rep" : [{id:all_signed_in_audit_accounts[account].getCellValue("Sales Rep")[0]['id']}],
                              "Days Since Born" : all_signed_in_audit_accounts[account].getCellValue("Days Since Born")
                           }})
      all_products.push({id: all_signed_in_audit_accounts[account].id, fields : {
                     "Commission Created?" : true
                  }})
   }
}



//get all sales rep data in dictionary
let sales_rep_dictionary = []
for (let sales_rep in records_sales_reps) {
   sales_rep_dictionary[records_sales_reps[sales_rep].getCellValue('Name')] = {}
   sales_rep_dictionary[records_sales_reps[sales_rep].getCellValue('Name')]['airtable_id'] = records_sales_reps[sales_rep].id
}
console.log("SALES REP DICTIONARY")
console.log(sales_rep_dictionary)



//get all white label partner data in dictionary 
let white_label_partners_all_dictionary = []
for (let record in records_active_accounts) {
   let white_label_partner = records_active_accounts[record].getCellValue("Agency (White Label)")
   let company = records_active_accounts[record].getCellValue("Company")
   if (white_label_partner in white_label_partners_all_dictionary) {
      white_label_partners_all_dictionary[white_label_partner].push(company)
   }
   else {
      white_label_partners_all_dictionary[white_label_partner] = []
      white_label_partners_all_dictionary[white_label_partner].push(company)
   }
}
let white_label_partners_first_invoice_company = []
for (let partner in white_label_partners_all_dictionary) {
   let partner_companies_invoices = records_invoices.filter(record => white_label_partners_all_dictionary[partner].includes(record.getCellValue('Company Name')))
   let partner_companies_invoices_sorted = partner_companies_invoices.sort((a, b) => a.getCellValue("Billing Date") > b.getCellValue("Billing Date") ? 1 : -1); //order in ascending order
   white_label_partners_first_invoice_company[partner] = partner_companies_invoices_sorted[0].getCellValue("Company Name")
}
console.log("WHITE LABEL PARTNERS FIRST INVOICE DICTIONARY")
console.log(white_label_partners_first_invoice_company)



//create commission
let client = invoice.getCellValue("Company Name")
let active_account_list = records_active_accounts.filter(record => record.getCellValue("Company") == client)
if (active_account_list.length < 1) {
   let active_account = active_account_list[0]
   if (active_account.getCellValue("Status") != null && active_account.getCellValue("Status")['name'] == 'Active') {
      if (active_account.getCellValue("Lead Type") != null && active_account.getCellValue("Sales Rep") != null) {
         if (active_account.getCellValue("Sales Rep") != 'Kasim Aslam' && active_account.getCellValue("Sales Rep") != 'John Moran') {
            let lead_type = active_account.getCellValue("Lead Type")['name']
            let monthly_fee = active_account.getCellValue("Monthly Fee")
            let billing_date = invoice.getCellValue("Billing Date")
            let white_label_partner = invoice.getCellValue("Agency (White Label)")
            let number_of_invoices = records_invoices.filter(record => record.getCellValue("Client") == client
                                                             && record.getCellValue("Billing Date") < billing_date
                                                            )
            
            //LOGIC IF LEAD TYPE IS INBOUND
            if (lead_type == 'Inbound') {
               if (number_of_invoices.length == INBOUND_INVOICES_BEFORE_STARTING_COMMISSION) { // if inbound first commission
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : INBOUND_STARTING_COMMISSION,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               } else if (number_of_invoices.length > INBOUND_INVOICES_BEFORE_STARTING_COMMISSION && number_of_invoices.length <= INBOUND_LAST_INVOICE_COMMISSION) {
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : INBOUND_COMMISSION_PERCENTAGE*monthly_fee,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               }

            //LOGIC IF LEAD TYPE IS OUTBOUND
            } else if (lead_type == 'Outbound') {
               if (number_of_invoices.length == OUTBOUND_INVOICES_BEFORE_STARTING_COMMISSION) { // if inbound first commission
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : OUTBOUND_STARTING_COMMISSION,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               } else if (number_of_invoices.length > OUTBOUND_INVOICES_BEFORE_STARTING_COMMISSION && number_of_invoices.length <= OUTBOUND_LAST_INVOICE_COMMISSION) {
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : OUTBOUND_COMMISSION_PERCENTAGE*monthly_fee,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               }

            //LOGIC IF LEAD TYPE IS REFERRAL
            } else if (lead_type == 'Referral') {
               if (number_of_invoices.length == REFERRAL_INVOICES_BEFORE_STARTING_COMMISSION) { // if inbound first commission
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : REFERRAL_STARTING_COMMISSION,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               } else if (number_of_invoices.length > REFERRAL_INVOICES_BEFORE_STARTING_COMMISSION && number_of_invoices.length <= REFERRAL_LAST_INVOICE_COMMISSION) {
                  all_new_commissions.push({ 
                                 fields : {
                                    'Regular Clients' : [{id:active_account.id}],
                                    'Price' : REFERRAL_PARTNER_COMMISSION*monthly_fee,
                                    "Company" : client,
                                    "Status" : {name:'Pending'},
                                    "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                    "Invoice Number" : number_of_invoices.length + 1
                                 }})
               }

            //LOGIC IF LEAD TYPE IS WHITE LABEL
            } else if (lead_type == 'White Label') {
               if (client == white_label_partners_first_invoice_company[white_label_partner]) {
                  if (number_of_invoices.length == WHITE_LABEL_INVOICES_BEFORE_STARTING_COMMISSION) { // if inbound first commission
                     all_new_commissions.push({ 
                                    fields : {
                                       'Regular Clients' : [{id:active_account.id}],
                                       'Price' : WHITE_LABEL_STARTING_COMMISSION,
                                       "Company" : client,
                                       "Status" : {name:'Pending'},
                                       "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                       "Invoice Number" : number_of_invoices.length + 1
                                    }})
                  } else if (number_of_invoices.length > WHITE_LABEL_INVOICES_BEFORE_STARTING_COMMISSION && number_of_invoices.length <= WHITE_LABEL_LAST_INVOICE_COMMISSION) {
                     all_new_commissions.push({ 
                                    fields : {
                                       'Regular Clients' : [{id:active_account.id}],
                                       'Price' : WHITE_LABEL_COMMISSION_PERCENTAGE*monthly_fee,
                                       "Company" : client,
                                       "Status" : {name:'Pending'},
                                       "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                       "Invoice Number" : number_of_invoices.length + 1
                                    }})
                  }
               } else if (number_of_invoices.length >= WHITE_LABEL_INVOICES_NOT_FIRST_CLIENT_BEFORE_COMMISSION  && number_of_invoices.length <= WHITE_LABEL_LAST_INVOICE_COMMISSION) {
                  all_new_commissions.push({ 
                                    fields : {
                                       'Regular Clients' : [{id:active_account.id}],
                                       'Price' : WHITE_LABEL_COMMISSION_PERCENTAGE*monthly_fee,
                                       "Company" : client,
                                       "Status" : {name:'Pending'},
                                       "Sales Rep" : [{id:sales_rep_dictionary[active_account.getCellValue("Sales Rep")]['airtable_id']}],
                                       "Invoice Number" : number_of_invoices.length + 1
                                    }})
               }
            }
            else {
               console.log(lead_type + " is not among the ones we usually work with")
            }
         } else {
            console.log("Sales Rep is either Kasim or John Moran so no commission")
         }
      } else {
          console.log("ERROR! No lead type or no sales rep")
      }
   } else {
      console.log("ERROR! No status or status not active")
   }
}
else {
   console.log("ERROR! No active account for client " + client)
}


console.log("CREATE COMMISSIONS")
console.log(all_new_commissions)
while (all_new_commissions.length > 0) {
   await table_commissions.createRecordsAsync(all_new_commissions.slice(0, 50));
   all_new_commissions = all_new_commissions.slice(50);
}

console.log("UPDATE PRODUCTS")
console.log(all_products)
while (all_products.length > 0) {
   await table_products.updateRecordsAsync(all_products.slice(0, 50));
   all_products = all_products.slice(50);
}
