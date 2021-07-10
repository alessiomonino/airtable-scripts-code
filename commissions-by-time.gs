//get all tables
let table_active_accounts = base.getTable('Active Accounts - Commissions');
let table_commissions = base.getTable('Commissions');
let table_sales_reps = base.getTable('Sales Reps');
let table_products = base.getTable('Products Purchased');

//import variables
let INBOUND_STARTING_COMMISSION = 500
let OUTBOUND_STARTING_COMMISSION = 1000
let AUDIT_DIMINISHED_PERCENTAGE = 0.5

let OUTBOUND_COMMISSION_PERCENTAGE =0.03
let INBOUND_COMMISSION_PERCENTAGE =0.03
let WHITE_LABEL_COMMISSION_PERCENTAGE =0.03

let OUTBOUND_MONTHS_COMMISSION = 36
let INBOUND_MONTHS_COMMISSION = 36
let WHITE_LABEL_MONTHS_COMMISSION = 36

let OUTBOUND_MONTHS_BEFORE_COMMISSION = 3
let INBOUND_MONTHS_BEFORE_COMMISSION = 3
let WHITE_LABEL_MONTHS_BEFORE_COMMISSION = 1

let REFERRAL_PARTNER_COMMISSION = 0.03 * 0.9

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

//get all active records
for (let account in records_active_accounts) {
   if (records_active_accounts[account].getCellValue("Status") != null && records_active_accounts[account].getCellValue("Status")['name'] == 'Active') {
      if (records_active_accounts[account].getCellValue("Lead Type") != null && records_active_accounts[account].getCellValue("Sales Rep") != null) {
         if (records_active_accounts[account].getCellValue("Sales Rep") != 'Kasim Aslam' && records_active_accounts[account].getCellValue("Sales Rep") != 'John Moran') {
            let lead_type = records_active_accounts[account].getCellValue("Lead Type")['name']
            let days_since_born = records_active_accounts[account].getCellValue("Days Since Born")
            let monthly_fee = records_active_accounts[account].getCellValue("Monthly Fee")
            if (days_since_born == INBOUND_MONTHS_BEFORE_COMMISSION*DAYS_IN_MONTH && lead_type == 'Inbound') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : INBOUND_STARTING_COMMISSION,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
            else if (days_since_born == OUTBOUND_MONTHS_BEFORE_COMMISSION*DAYS_IN_MONTH && lead_type == 'Outbound') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : OUTBOUND_STARTING_COMMISSION,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
            else if (days_since_born > INBOUND_MONTHS_BEFORE_COMMISSION*DAYS_IN_MONTH && days_since_born <= (INBOUND_MONTHS_BEFORE_COMMISSION+INBOUND_MONTHS_COMMISSION)*DAYS_IN_MONTH && days_since_born%DAYS_IN_MONTH==0 && lead_type == 'Inbound') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : INBOUND_COMMISSION_PERCENTAGE*monthly_fee,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
            else if (days_since_born > OUTBOUND_MONTHS_BEFORE_COMMISSION*DAYS_IN_MONTH && days_since_born <= (OUTBOUND_MONTHS_BEFORE_COMMISSION+OUTBOUND_MONTHS_COMMISSION)*DAYS_IN_MONTH && days_since_born%DAYS_IN_MONTH==0 && lead_type == 'Outbound') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : OUTBOUND_COMMISSION_PERCENTAGE*monthly_fee,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
            else if (days_since_born > WHITE_LABEL_MONTHS_BEFORE_COMMISSION*DAYS_IN_MONTH && days_since_born <= (WHITE_LABEL_MONTHS_BEFORE_COMMISSION+WHITE_LABEL_MONTHS_COMMISSION)*DAYS_IN_MONTH && days_since_born%DAYS_IN_MONTH==0 && lead_type == 'White Label') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : WHITE_LABEL_COMMISSION_PERCENTAGE*monthly_fee,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
            else if (days_since_born%DAYS_IN_MONTH == 0 && lead_type == 'Referral') {
               all_new_commissions.push({ 
                              fields : {
                                 'Regular Clients' : [{id:records_active_accounts[account].id}],
                                 'Price' : REFERRAL_PARTNER_COMMISSION*monthly_fee,
                                 "Company" : records_active_accounts[account].getCellValue("Company"),
                                 "Status" : {name:'Pending'},
                                 "Sales Rep" : [{id:sales_rep_dictionary[records_active_accounts[account].getCellValue("Sales Rep")]['airtable_id']}],
                                 "Days Since Born" : records_active_accounts[account].getCellValue("Days Since Born")
                              }})
            }
         }
      }
   }
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
