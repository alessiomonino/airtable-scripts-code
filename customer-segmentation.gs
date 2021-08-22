//-----------
//GET TABLES
//-----------
const table_invoices = base.getTable("Invoices")
const table_accounts = base.getTable("Accounts")
const table_companies = base.getTable("Companies")
const table_customer_segments = base.getTable("Customer Segments")


//-----------
//GET RECORDS
//-----------
let records_invoices_raw = await table_invoices.selectRecordsAsync()
let records_invoices = records_invoices_raw.records
let records_accounts_raw = await table_accounts.selectRecordsAsync()
let records_accounts = records_accounts_raw.records
let records_companies_raw = await table_companies.selectRecordsAsync()
let records_companies = records_companies_raw.records
let records_customer_segments_raw = await table_customer_segments.selectRecordsAsync()
let records_customer_segments = records_customer_segments_raw.records


//---------------------------------------
//FUNCTION TO FIND Nth LARGEST ELEMENT
//------------------------------------
function nthlargest(arra,highest){
			var x = 0,
				y = 0,
				z = 0,
				temp = 0,
				tnum = arra.length, 
				flag = false, 
				result = false; 
   
			while(x < tnum){
				y = x + 1; 
				
				if(y < tnum){
					for(z = y; z < tnum; z++){
						
						if(arra[x] < arra[z]){
							temp = arra[z];
							arra[z] = arra[x];
							arra[x] = temp;
							flag = true; 
						}else{
							continue;
						}	
					}					
				}
				
				if(flag){
					flag = false;
				}else{
					x++; 
					if(x === highest){ 
                      
						result = true;
					}	
				}
				if(result){
					break;
				}
			}

			return (arra[(highest - 1)]);	
		}



//----------------------
//CREATE COMPANIES ARRAY
//---------------------
let array_to_update = []
console.log(records_companies[0].getCellValue('Tags'))
let companies_array = []
let invoices_to_update = []
for (let company_index in records_companies) {
  let company = records_companies[company_index]
  //SPEED IMPROVEMENT OPPORTUNITY: instead of filtering entire invoices number for each run just run a for loop across each invoice one time
  let invoices = records_invoices.filter(record => record.getCellValue("Client (from Project)")[0] == company.id)
  let company_dictionary = {}
  if (records_companies[company_index].getCellValue("Niche") != null) {
    company_dictionary['niche'] = records_companies[company_index].getCellValue("Niche")['name']
  }
  else {
    company_dictionary['niche'] = 'No Niche'
  }
  if (invoices.length < 1) { //sometimes a company has no invoices so invoices.length would fail
    company_dictionary['tags'] = []
    company_dictionary['id'] = company.id
    company_dictionary['invoices_number'] = 0
    company_dictionary['total_spent'] = 0
    company_dictionary['average_spent'] = 0
  }
  else {
    company_dictionary['tags'] = []
    company_dictionary['id'] = company.id
    company_dictionary['invoices_number'] = invoices.length
    company_dictionary['total_spent'] = 0

    //get total invoices amount
    for (let invoice in invoices) {
        company_dictionary['total_spent'] = company_dictionary['total_spent'] + invoices[invoice].getCellValue("Billed Amount")
    }

    //check that there are no zeros, then compute average
    if (company_dictionary['total_spent'] > 0 && company_dictionary['invoices_number'] > 0) {
      company_dictionary['average_spent'] = company_dictionary['total_spent']/company_dictionary['invoices_number']
    }
    else {
      company_dictionary['average_spent'] = 0
    }
  }
  companies_array.push(company_dictionary)
}


console.log("ALL COMPANIES")
console.log(companies_array)

let companies_array_total_spent = companies_array.map(record => record['total_spent'])
let companies_array_invoices_number = companies_array.map(record => record['invoices_number'])
let companies_array_total_spent10 = nthlargest(companies_array_total_spent,Math.round(companies_array_total_spent.length*0.1))
let companies_array_total_spent30 = nthlargest(companies_array_total_spent,Math.round(companies_array_total_spent.length*0.3))
console.log("companies_array_total_spent10 -> " + companies_array_total_spent10)
console.log("companies_array_total_spent30 -> " + companies_array_total_spent30)


//-----------------------------------------------
//CREATE DICTIONARY WITH METRICS FOR EACH SEGMENT
//-----------------------------------------------
let dictionary_customer_segments = {}


//-----------------------------------------------
//FUNCTION TO UPDATE DICTIONARY CUSTOMER SEGMENTS
//-----------------------------------------------
function updateSegmentsDictionary(customer_segment, companies_included_ids, customer_data, dictionary_customer_segments) {
  dictionary_customer_segments[customer_segment] = {}
  dictionary_customer_segments[customer_segment]['Name'] = customer_segment
  let companies_included_list = []
  for (let company in companies_included_ids) {
      companies_included_list.push({id:companies_included_ids[company]})
  }
  dictionary_customer_segments[customer_segment]['# of Companies'] = customer_data.length
  dictionary_customer_segments[customer_segment]['Aggregate Amount Spent'] = 0
  for (let top_company in customer_data) {
    dictionary_customer_segments[customer_segment]['Aggregate Amount Spent'] += customer_data[top_company]['total_spent']
  }
  dictionary_customer_segments[customer_segment]['Mean Spent'] = Math.round(dictionary_customer_segments[customer_segment]['Aggregate Amount Spent']/dictionary_customer_segments[customer_segment]['# of Companies'])
  dictionary_customer_segments[customer_segment]['Member Companies'] = companies_included_list
  return dictionary_customer_segments
}


//------------------------------
//BASED ON SPENDING SEGMENTATION
//------------------------------
// get Top Spenders
let companies_by_total_spent_top_spender = companies_array.filter(record => record['total_spent'] >= companies_array_total_spent10)
let companies_by_total_spent_top_spender_ids = companies_by_total_spent_top_spender.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('Top 10% Spenders', companies_by_total_spent_top_spender_ids, companies_by_total_spent_top_spender, dictionary_customer_segments)

// get Medium Spenders
let companies_by_total_spent_medium_spender = companies_array.filter(record => record['total_spent'] < companies_array_total_spent10
                                                                                && record['total_spent'] >= companies_array_total_spent30)
let companies_by_total_spent_medium_spender_ids = companies_by_total_spent_medium_spender.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('Top 30% Spenders', companies_by_total_spent_medium_spender_ids, companies_by_total_spent_medium_spender, dictionary_customer_segments)


//-----------------------
//BASED ON LOYALTY BY YEAR
//-----------------------
// get customers more than 1 year
let companies_by_total_invoices_1yearplus = companies_array.filter(record => record['invoices_number'] >= 12
                                                                    && record['invoices_number'] < 24)
let companies_by_total_invoices_1yearplus_ids = companies_by_total_invoices_1yearplus.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('1+ Year Loyalty', companies_by_total_invoices_1yearplus_ids, companies_by_total_invoices_1yearplus, dictionary_customer_segments)

// get customers more than 2 years
let companies_by_total_invoices_2yearplus = companies_array.filter(record => record['invoices_number'] >= 24
                                                                    && record['invoices_number'] < 60)
let companies_by_total_invoices_2yearplus_ids = companies_by_total_invoices_2yearplus.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('2+ Year Loyalty', companies_by_total_invoices_2yearplus_ids, companies_by_total_invoices_2yearplus, dictionary_customer_segments)

// get customers more than 5 years
let companies_by_total_invoices_5yearplus = companies_array.filter(record => record['invoices_number'] >= 60)
let companies_by_total_invoices_5yearplus_ids = companies_by_total_invoices_5yearplus.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('5+ Year Loyalty', companies_by_total_invoices_5yearplus_ids, companies_by_total_invoices_5yearplus, dictionary_customer_segments)


//---------------
//BASED ON NICHES
//---------------
let niches = table_companies.getField("Niche")['options']['choices'];
for (let niche_index in niches) {
  let niche = niches[niche_index]['name']
  let companies_by_niche = companies_array.filter(record => record['niche'] == niche)
  let companies_by_niche_ids = companies_by_niche.map(record => record['id'])
  dictionary_customer_segments = updateSegmentsDictionary(niche, companies_by_niche_ids, companies_by_niche, dictionary_customer_segments)
}
let no_niche_companies = companies_array.filter(record => record['niche'] == 'No Niche')
let no_niche_companies_ids = no_niche_companies.map(record => record['id'])
dictionary_customer_segments = updateSegmentsDictionary('No Niche', no_niche_companies_ids, no_niche_companies, dictionary_customer_segments)


//-------------
//CREATING TAGS
//-------------
for (let company in companies_array){
  if (companies_by_total_spent_top_spender_ids.includes(companies_array[company]['id'])) {
    companies_array[company]['tags'].push({'name':"Top 10% Spenders"})
  }
  if (companies_by_total_spent_medium_spender_ids.includes(companies_array[company]['id'])) {
    companies_array[company]['tags'].push({'name':"Top 30% Spenders"})
  }
  if (companies_by_total_invoices_1yearplus_ids.includes(companies_array[company]['id'])) {
    companies_array[company]['tags'].push({'name':"1+ Year Loyalty"})
  }
  if (companies_by_total_invoices_2yearplus_ids.includes(companies_array[company]['id'])) {
    companies_array[company]['tags'].push({'name':"2+ Year Loyalty"})
  }
  if (companies_by_total_invoices_5yearplus_ids.includes(companies_array[company]['id'])) {
    companies_array[company]['tags'].push({'name':"5+ Year Loyalty"})
  }
}


//------------------------------------
//Update the companies with their tags
//------------------------------------
console.log("Companies with tags")
console.log(companies_array)
for (let company in companies_array){ 
  array_to_update.push({ id : companies_array[company]['id'], fields : {
                          "Tags" : companies_array[company]['tags'],
                          "Total Spent" : companies_array[company]['total_spent'],
                          "Total Invoices" : companies_array[company]['invoices_number']
                      }})
}
//print dictionary
console.log("CUSTOMER SEGMENTS DICTIONARY")
console.log(dictionary_customer_segments)


//------------------------
//UPDATE CUSTOMER SEGMENTS
//------------------------
let array_to_update_customer_segments = []
let array_to_create_customer_segments = []
for (let customer_segment in dictionary_customer_segments) {
  let customer_segment_ids = records_customer_segments.filter(record => record.getCellValue('Name') == customer_segment)
  if (customer_segment_ids.length > 0) {
    array_to_update_customer_segments.push({ id : customer_segment_ids[0]['id'], fields : {
                                            '# of Companies' : Number(dictionary_customer_segments[customer_segment]['# of Companies']),
                                            'Aggregate Amount Spent' : Number(dictionary_customer_segments[customer_segment]['Aggregate Amount Spent']),
                                            'Mean Spent' : Number(dictionary_customer_segments[customer_segment]['Mean Spent']),
                                            'Member Companies' : dictionary_customer_segments[customer_segment]['Member Companies'],
                                          }})
  }
  else {
    array_to_create_customer_segments.push({ fields: {
                                            'Name' : dictionary_customer_segments[customer_segment]['Name'],
                                            '# of Companies' : Number(dictionary_customer_segments[customer_segment]['# of Companies']),
                                            'Aggregate Amount Spent' : Number(dictionary_customer_segments[customer_segment]['Aggregate Amount Spent']),
                                            'Mean Spent' : Number(dictionary_customer_segments[customer_segment]['Mean Spent']),
                                            'Member Companies' : dictionary_customer_segments[customer_segment]['Member Companies'],
                                          }})
  }
}


//------------------------
//UPDATE COMPANIES IN BULK
//------------------------
while (array_to_update.length > 0) {
   await table_companies.updateRecordsAsync(array_to_update.slice(0, 50));
   array_to_update = array_to_update.slice(50);
}
console.log(dictionary_customer_segments)


//--------------------------------
//UPDATE CUSTOMER SEGMENTS IN BULK
//--------------------------------
while (array_to_update_customer_segments.length > 0) {
   await table_customer_segments.updateRecordsAsync(array_to_update_customer_segments.slice(0, 50));
   array_to_update_customer_segments = array_to_update_customer_segments.slice(50);
}
while (array_to_create_customer_segments.length > 0) {
   await table_customer_segments.createRecordsAsync(array_to_create_customer_segments.slice(0, 50));
   array_to_create_customer_segments = array_to_create_customer_segments.slice(50);
}


//---------
//FIELD IDs
//---------
// console.log(table_customer_segments.getField("Name"))
// console.log(table_customer_segments.getField("# of Companies"))
// console.log(table_customer_segments.getField("Aggregate Amount Spent"))
// console.log(table_customer_segments.getField("Mean Spent"))
// console.log(table_customer_segments.getField("Member Companies"))



