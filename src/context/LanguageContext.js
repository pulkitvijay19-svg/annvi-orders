"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const TRANSLATIONS = {
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  dashboard_subtitle: { en: "Daily order control and delivery planning.", bn: "দৈনিক অর্ডার কন্ট্রোল ও ডেলিভারি প্ল্যানিং।" },
  enable_notifications: { en: "Enable Notifications", bn: "নোটিফিকেশন চালু" },
  logout: { en: "Logout", bn: "লগআউট" },
  view_orders: { en: "View Orders", bn: "অর্ডার দেখুন" },
  add_order: { en: "+ Add Order", bn: "+ অর্ডার যোগ" },
  sample_catalog: { en: "Sample Catalog", bn: "স্যাম্পল ক্যাটালগ" },
  direct_tag_print: { en: "Direct Tag Print", bn: "ডাইরেক্ট ট্যাগ প্রিন্ট" },
  manufacturing: { en: "Manufacturing", bn: "ম্যানুফ্যাকচারিং" },

  total_orders: { en: "Total Orders", bn: "মোট অর্ডার" },
  pending: { en: "Pending", bn: "পেন্ডিং" },
  today_delivery: { en: "Today Delivery", bn: "আজকের ডেলিভারি" },
  delayed: { en: "Delayed", bn: "দেরি হয়েছে" },
  ready: { en: "Ready", bn: "রেডি" },
  urgent: { en: "Urgent", bn: "জরুরি" },

  hardware_manager: { en: "Hardware Manager", bn: "হার্ডওয়্যার ম্যানেজার" },
  hardware_status: { en: "Print bridge and scale bridge status", bn: "প্রিন্ট ব্রিজ ও স্কেল ব্রিজ স্ট্যাটাস" },
  refresh: { en: "Refresh", bn: "রিফ্রেশ" },
  print_bridge: { en: "Print Bridge", bn: "প্রিন্ট ব্রিজ" },
  scale_bridge: { en: "Scale Bridge", bn: "স্কেল ব্রিজ" },
  connected: { en: "Connected", bn: "সংযুক্ত" },
  disconnected: { en: "Disconnected", bn: "বিচ্ছিন্ন" },
  start: { en: "Start", bn: "চালু" },
  stop: { en: "Stop", bn: "বন্ধ" },

  recent_orders: { en: "Recent Orders", bn: "সাম্প্রতিক অর্ডার" },
  view_all: { en: "View All", bn: "সব দেখুন" },
  order_no: { en: "Order No", bn: "অর্ডার নং" },
  customer: { en: "Customer", bn: "কাস্টমার" },
  customer_name: { en: "Customer Name", bn: "কাস্টমার নাম" },
  mobile_number: { en: "Mobile Number", bn: "মোবাইল নম্বর" },
  delivery: { en: "Delivery", bn: "ডেলিভারি" },
  delivery_date: { en: "Delivery Date", bn: "ডেলিভারি তারিখ" },
  pieces: { en: "Pieces", bn: "পিস" },
  weight: { en: "Weight", bn: "ওজন" },
  priority: { en: "Priority", bn: "প্রায়োরিটি" },
  status: { en: "Status", bn: "স্ট্যাটাস" },
  action: { en: "Action", bn: "অ্যাকশন" },
  view: { en: "View", bn: "দেখুন" },

  checking_login: { en: "Checking login...", bn: "লগইন চেক হচ্ছে..." },
  new_order_received: { en: "New Order Received", bn: "নতুন অর্ডার এসেছে" },
  hardware_not_running: { en: "Hardware Manager is not running. Start it first.", bn: "হার্ডওয়্যার ম্যানেজার চলছে না। আগে চালু করুন।" },

  add_new_order: { en: "Add New Order", bn: "নতুন অর্ডার যোগ করুন" },
  create_track_orders: { en: "Create and track customer orders.", bn: "কাস্টমার অর্ডার তৈরি ও ট্র্যাক করুন।" },
  customer_details: { en: "Customer Details", bn: "কাস্টমার ডিটেইলস" },
  order_items: { en: "Order Items", bn: "অর্ডার আইটেম" },
  design_images: { en: "Design Images", bn: "ডিজাইন ছবি" },
  save_order: { en: "Save Order", bn: "অর্ডার সেভ" },
  order_remarks: { en: "Order remarks", bn: "অর্ডার মন্তব্য" },
  item_remarks: { en: "Item Remarks", bn: "আইটেম মন্তব্য" },
  add_category: { en: "+ Add Category", bn: "+ ক্যাটাগরি যোগ" },
  category_group: { en: "Category Group", bn: "ক্যাটাগরি গ্রুপ" },
  category: { en: "Category", bn: "ক্যাটাগরি" },
  sample_id: { en: "Sample ID", bn: "স্যাম্পল আইডি" },
  approx_weight: { en: "Approx Weight", bn: "আনুমানিক ওজন" },
  size: { en: "Size", bn: "সাইজ" },

  tag_details: { en: "Tag Details", bn: "ট্যাগ ডিটেইলস" },
  brand: { en: "Brand", bn: "ব্র্যান্ড" },
  karat: { en: "Karat", bn: "ক্যারেট" },
  gross_weight: { en: "Gross Weight", bn: "মোট ওজন" },
  less_weight: { en: "Less Weight", bn: "কম ওজন" },
  net_weight: { en: "Net Weight", bn: "নেট ওজন" },
  stone_charges: { en: "Stone Charges", bn: "পাথর চার্জ" },
  tag_id: { en: "Tag ID / QR", bn: "ট্যাগ নম্বর / QR" },
  live_scale: { en: "Live Scale", bn: "লাইভ ওজন" },
  use_scale_weight: { en: "Use Scale Weight", bn: "স্কেলের ওজন নিন" },
  print_tag: { en: "Print Tag", bn: "ট্যাগ প্রিন্ট" },
  reset: { en: "Reset", bn: "রিসেট" },

  save: { en: "Save", bn: "সেভ" },
  save_draft: { en: "Save Draft", bn: "ড্রাফট সেভ" },
  close: { en: "Close", bn: "বন্ধ করুন" },
  loading: { en: "Loading...", bn: "লোড হচ্ছে..." },
  remarks: { en: "Remarks", bn: "মন্তব্য" },

  process_type: { en: "Process Type", bn: "প্রসেস টাইপ" },
  operator_karigar: { en: "Operator / Karigar", bn: "অপারেটর / কারিগর" },
  issued_pieces: { en: "Issued Pieces", bn: "দেওয়া পিস" },
  issued_weight: { en: "Issued Weight", bn: "দেওয়া ওজন" },
  good_pieces: { en: "Good Pieces", bn: "ভালো পিস" },
  good_weight: { en: "Good Weight", bn: "ভালো ওজন" },
  repair_pieces: { en: "Repair Pieces", bn: "রিপেয়ার পিস" },
  repair_weight: { en: "Repair Weight", bn: "রিপেয়ার ওজন" },
  rejected_pieces: { en: "Rejected Pieces", bn: "বাতিল পিস" },
  rejected_weight: { en: "Rejected Weight", bn: "বাতিল ওজন" },
  current_pcs: { en: "Current Pcs", bn: "বর্তমান পিস" },
  current_wt: { en: "Current Wt", bn: "বর্তমান ওজন" },
  entries: { en: "Entries", bn: "এন্ট্রি" },
  items_summary: { en: "Items Summary", bn: "আইটেম সামারি" },
  process_entry: { en: "Process Entry", bn: "প্রসেস এন্ট্রি" },
  loss: { en: "Loss", bn: "লস" },

add_new_order: { en: "Add New Order", bn: "নতুন অর্ডার যোগ করুন" },
create_track_orders: { en: "Create and track customer orders.", bn: "কাস্টমার অর্ডার তৈরি ও ট্র্যাক করুন।" },
customer_details: { en: "Customer Details", bn: "কাস্টমার ডিটেইলস" },
order_items: { en: "Order Items", bn: "অর্ডার আইটেম" },
design_images: { en: "Design Images", bn: "ডিজাইন ছবি" },
add_category: { en: "+ Add Category", bn: "+ ক্যাটাগরি যোগ" },
quantity: { en: "Quantity", bn: "পিস" },
sample_search: { en: "Type Sample ID / Last 3 digits and select multiple", bn: "স্যাম্পল আইডি / শেষ ৩ ডিজিট লিখুন" },
saving_order: { en: "Saving Order...", bn: "অর্ডার সেভ হচ্ছে..." },

orders: { en: "Orders", bn: "অর্ডার" },

orders_subtitle: {
  en: "Search, filter and track all customer orders.",
  bn: "সব কাস্টমার অর্ডার খুঁজুন, ফিল্টার করুন এবং ট্র্যাক করুন।"
},

search_orders: {
  en: "Search order no, customer, mobile...",
  bn: "অর্ডার নম্বর, কাস্টমার বা মোবাইল খুঁজুন..."
},

showing: {
  en: "Showing",
  bn: "দেখানো হচ্ছে"
},

of: {
  en: "of",
  bn: "মোট"
},

loading_orders: {
  en: "Loading orders...",
  bn: "অর্ডার লোড হচ্ছে..."
},

no_orders_found: {
  en: "No orders found.",
  bn: "কোন অর্ডার পাওয়া যায়নি।"
},

image: {
  en: "Image",
  bn: "ছবি"
},

no_image: {
  en: "No Image",
  bn: "কোন ছবি নেই"
},

view: {
  en: "View",
  bn: "দেখুন"
},

loading_order: {
  en: "Loading order...",
  bn: "অর্ডার লোড হচ্ছে..."
},

checking_login: {
  en: "Checking login...",
  bn: "লগইন যাচাই হচ্ছে..."
},

order_detail_subtitle: {
  en: "View complete order information.",
  bn: "সম্পূর্ণ অর্ডারের তথ্য দেখুন।"
},

back: {
  en: "Back",
  bn: "ফিরে যান"
},

edit: {
  en: "Edit",
  bn: "এডিট"
},

print_order: {
  en: "Print Order",
  bn: "অর্ডার প্রিন্ট"
},

delete: {
  en: "Delete",
  bn: "ডিলিট"
},

current_status: {
  en: "Current Status",
  bn: "বর্তমান স্ট্যাটাস"
},

created: {
  en: "Created",
  bn: "তৈরি হয়েছে"
},

update_status: {
  en: "Update Status",
  bn: "স্ট্যাটাস আপডেট"
},

updating: {
  en: "Updating...",
  bn: "আপডেট হচ্ছে..."
},

send_status_party: {
  en: "Send Status to Party",
  bn: "পার্টিকে স্ট্যাটাস পাঠান"
},

send_status_chacha: {
  en: "Send Status to Chacha",
  bn: "চাচাকে স্ট্যাটাস পাঠান"
},

sample_id: {
  en: "Sample ID",
  bn: "স্যাম্পল আইডি"
},

die_no: {
  en: "Die No",
  bn: "ডাই নম্বর"
},

quantity: {
  en: "Quantity",
  bn: "পরিমাণ"
},

gold_kt: {
  en: "Gold KT",
  bn: "গোল্ড ক্যারেট"
},

total_pieces: {
  en: "Total Pieces",
  bn: "মোট পিস"
},

total_approx_weight: {
  en: "Total Approx Weight",
  bn: "মোট আনুমানিক ওজন"
},

design_images: {
  en: "Design Images",
  bn: "ডিজাইন ছবি"
},

no_images_uploaded: {
  en: "No images uploaded",
  bn: "কোনো ছবি আপলোড করা হয়নি"
},

edit_order: {
  en: "Edit Order",
  bn: "অর্ডার সম্পাদনা"
},

edit_order_subtitle: {
  en: "Update customer, items, sample ID, die no and images.",
  bn: "কাস্টমার, আইটেম, স্যাম্পল আইডি, ডাই নম্বর ও ছবি আপডেট করুন।"
},

back_to_order: {
  en: "Back to Order",
  bn: "অর্ডারে ফিরে যান"
},

orders: {
  en: "Orders",
  bn: "অর্ডার"
},

customer_details: {
  en: "Customer Details",
  bn: "কাস্টমার ডিটেইলস"
},

customer_name: {
  en: "Customer Name",
  bn: "কাস্টমারের নাম"
},

mobile_number: {
  en: "Mobile Number",
  bn: "মোবাইল নম্বর"
},

delivery_date: {
  en: "Delivery Date",
  bn: "ডেলিভারির তারিখ"
},

order_remarks: {
  en: "Order Remarks",
  bn: "অর্ডার মন্তব্য"
},

order_items: {
  en: "Order Items",
  bn: "অর্ডার আইটেম"
},

add_item: {
  en: "Add Item",
  bn: "আইটেম যোগ করুন"
},

item: {
  en: "Item",
  bn: "আইটেম"
},

remove: {
  en: "Remove",
  bn: "মুছুন"
},

sample_id: {
  en: "Sample ID / Last 3 digits",
  bn: "স্যাম্পল আইডি / শেষ ৩ সংখ্যা"
},

die_no: {
  en: "Die No",
  bn: "ডাই নম্বর"
},

quantity: {
  en: "Quantity",
  bn: "পরিমাণ"
},

approx_weight: {
  en: "Approx Weight",
  bn: "আনুমানিক ওজন"
},

size: {
  en: "Size",
  bn: "সাইজ"
},

item_remarks: {
  en: "Item Remarks",
  bn: "আইটেম মন্তব্য"
},

existing_images: {
  en: "Existing Images",
  bn: "বর্তমান ছবি"
},

no_images_uploaded: {
  en: "No images uploaded.",
  bn: "কোন ছবি আপলোড করা হয়নি।"
},

add_more_images: {
  en: "Add More Images",
  bn: "আরও ছবি যোগ করুন"
},

saving_changes: {
  en: "Saving Changes...",
  bn: "পরিবর্তন সংরক্ষণ হচ্ছে..."
},

update_order: {
  en: "Update Order",
  bn: "অর্ডার আপডেট"
},

casting_batch: {
     en: "Casting Batch",
      bn: "কাস্টিং ব্যাচ"
     },

casting_subtitle: { en: "Select order items and calculate metal issue.", bn: "অর্ডার আইটেম নির্বাচন করুন এবং মেটাল ইস্যু হিসাব করুন।" },
casting_dashboard: { en: "Casting Dashboard", bn: "কাস্টিং ড্যাশবোর্ড" },
inventory: { en: "Inventory", bn: "ইনভেন্টরি" },
select_orders: { en: "1. Select Orders", bn: "১. অর্ডার নির্বাচন" },
select_items: { en: "2. Select Items", bn: "২. আইটেম নির্বাচন" },
batch_details: { en: "3. Batch Details", bn: "৩. ব্যাচ ডিটেইলস" },
metal_inputs: { en: "4. Metal Inputs", bn: "৪. মেটাল ইনপুট" },
fine_gold_calculation: { en: "5. Fine Gold Calculation", bn: "৫. ফাইন গোল্ড হিসাব" },
scrap_conversion_calculation: { en: "6. Scrap Conversion Calculation", bn: "৬. স্ক্র্যাপ কনভার্সন হিসাব" },
final_total_calculation: { en: "7. Final Total Calculation", bn: "৭. ফাইনাল টোটাল হিসাব" },
target_kt: { en: "Target KT", bn: "টার্গেট ক্যারেট" },
tree_weight: { en: "Tree Weight", bn: "ট্রি ওজন" },
actual_metal_weight: { en: "Actual Metal Weight", bn: "আসল মেটাল ওজন" },
suggested_metal: { en: "Suggested Metal", bn: "সাজেস্টেড মেটাল" },
select_all: { en: "Select All", bn: "সব নির্বাচন" },
unselect_all: { en: "Unselect All", bn: "সব বাদ দিন" },
select_order_first: { en: "Select order first.", bn: "আগে অর্ডার নির্বাচন করুন।" },
add: { en: "+ Add", bn: "+ যোগ করুন" },
full_995_fine_required: { en: "Full 995 Fine Required", bn: "মোট ৯৯৫ ফাইন লাগবে" },
fine_995_entered: { en: "995 Fine Entered", bn: "৯৯৫ ফাইন দেওয়া" },
fine_generated_metal: { en: "Fine Generated Metal", bn: "ফাইন থেকে তৈরি মেটাল" },
alloy_for_fine: { en: "Alloy For Fine", bn: "ফাইনের জন্য অ্যালয়" },
scrap_kt: { en: "Scrap KT", bn: "স্ক্র্যাপ ক্যারেট" },
type: { en: "Type", bn: "টাইপ" },
generated_metal: { en: "Generated Metal", bn: "তৈরি মেটাল" },
alloy_needed: { en: "Alloy Needed", bn: "অ্যালয় লাগবে" },
fine_995_needed: { en: "995 Fine Needed", bn: "৯৯৫ ফাইন লাগবে" },
target_metal: { en: "Target Metal", bn: "টার্গেট মেটাল" },
remaining_metal: { en: "Remaining Metal", bn: "বাকি মেটাল" },
total_alloy_required: { en: "Total Alloy Required", bn: "মোট অ্যালয় লাগবে" },
total_995_fine_required: { en: "Total 995 Fine Required", bn: "মোট ৯৯৫ ফাইন লাগবে" },
creating: { en: "Creating...", bn: "তৈরি হচ্ছে..." },
create_casting_batch: { en: "Create Casting Batch", bn: "কাস্টিং ব্যাচ তৈরি করুন" },

select_order_first: {
  en: "Select order first.",
  bn: "আগে অর্ডার নির্বাচন করুন।",
},

optional: {
  en: "Optional",
  bn: "ঐচ্ছিক",
},

no_scrap_entered: {
  en: "No scrap entered.",
  bn: "কোন স্ক্র্যাপ দেওয়া হয়নি।",
},

loading_casting_batches: {
  en: "Loading casting batches...",
  bn: "কাস্টিং ব্যাচ লোড হচ্ছে..."
},

casting_dashboard_subtitle: {
  en: "Open casting batches and enter results.",
  bn: "কাস্টিং ব্যাচ খুলে রেজাল্ট এন্ট্রি করুন।"
},

new_casting: {
  en: "New Casting",
  bn: "নতুন কাস্টিং"
},

no_active_casting_batch: {
  en: "No active casting batch.",
  bn: "কোনো অ্যাক্টিভ কাস্টিং ব্যাচ নেই।"
},

order: {
  en: "Order",
  bn: "অর্ডার"
},

party: {
  en: "Party",
  bn: "পার্টি"
},

open: {
  en: "Open",
  bn: "খুলুন"
},

tree: {
  en: "Tree",
  bn: "ট্রি"
},

issued: {
  en: "Issued",
  bn: "ইস্যু"
},

input: {
  en: "Input",
  bn: "ইনপুট"
},

items: {
  en: "Items",
  bn: "আইটেম"
},

groups: {
  en: "groups",
  bn: "গ্রুপ"
},

casting_result: {
  en: "Casting Result",
  bn: "কাস্টিং রেজাল্ট"
},

good_pieces: {
  en: "Good Pieces",
  bn: "ভালো পিস"
},

bad_pieces: {
  en: "Bad Pieces",
  bn: "খারাপ পিস"
},

received_pieces_weight: {
  en: "Received Pieces Weight",
  bn: "রিসিভ পিস ওজন"
},

scrap_weight: {
  en: "Scrap Weight",
  bn: "স্ক্র্যাপ ওজন"
},

casting_loss: {
  en: "Casting Loss",
  bn: "কাস্টিং লস"
},

good_bad: {
  en: "Good+Bad",
  bn: "ভালো+খারাপ"
},

selected: {
  en: "Selected",
  bn: "নির্বাচিত"
},

casting_loss_formula: {
  en: "Loss = Issued Metal - Received Pieces Weight - Scrap Weight",
  bn: "লস = ইস্যু মেটাল - রিসিভ পিস ওজন - স্ক্র্যাপ ওজন"
},

saving: {
  en: "Saving...",
  bn: "সেভ হচ্ছে..."
},

save_result: {
  en: "Save Result",
  bn: "রেজাল্ট সেভ"
},

move_to_magnet: {
  en: "Move To Magnet",
  bn: "ম্যাগনেটে পাঠান"
},

casting_fail: {
  en: "Casting Fail",
  bn: "কাস্টিং ফেল"
},


select_casting_batches: {
  en: "Select casting batches",
  bn: "কাস্টিং ব্যাচ নির্বাচন করুন"
},

same_kt_batches_only: {
  en: "Only same KT batches can be clubbed",
  bn: "শুধুমাত্র একই ক্যারেটের ব্যাচ একসাথে ক্লাব করা যাবে"
},

magnet_batch_created: {
  en: "Magnet batch created",
  bn: "ম্যাগনেট ব্যাচ তৈরি হয়েছে"
},

confirm_remove_casting_club: {
  en: "Remove this casting from the club?",
  bn: "এই কাস্টিংটি ক্লাব থেকে সরাবেন?"
},

casting_removed_from_club: {
  en: "Casting removed from club",
  bn: "কাস্টিং ক্লাব থেকে সরানো হয়েছে"
},

confirm_delete_magnet_batch: {
  en: "Delete this magnet batch? All casting batches will return to Magnet.",
  bn: "এই ম্যাগনেট ব্যাচ ডিলিট করবেন? সব কাস্টিং ব্যাচ আবার ম্যাগনেটে ফিরে যাবে।"
},

magnet_batch_deleted: {
  en: "Magnet batch deleted",
  bn: "ম্যাগনেট ব্যাচ ডিলিট হয়েছে"
},

loading_magnet_dashboard: {
  en: "Loading magnet dashboard...",
  bn: "ম্যাগনেট ড্যাশবোর্ড লোড হচ্ছে..."
},

club_these_batches: {
  en: "Club These Batches",
  bn: "এই ব্যাচগুলো একসাথে করুন"
},

active_magnet_clubs: {
  en: "Active Magnet Clubs",
  bn: "সক্রিয় ম্যাগনেট ক্লাব"
},

no_clubbed_magnet_batch: {
  en: "No clubbed magnet batch yet.",
  bn: "এখনও কোনো ক্লাব করা ম্যাগনেট ব্যাচ নেই।"
},

single_casting_ready_for_magnet: {
  en: "Single Casting Batches Ready For Magnet",
  bn: "ম্যাগনেটের জন্য প্রস্তুত সিঙ্গেল কাস্টিং ব্যাচ"
},

no_single_casting_waiting: {
  en: "No single casting batch waiting for magnet.",
  bn: "ম্যাগনেটের জন্য কোনো সিঙ্গেল কাস্টিং ব্যাচ অপেক্ষায় নেই।"
},

process: {
  en: "Process",
  bn: "প্রসেস"
},

pieces_weight: {
  en: "Pieces Wt",
  bn: "পিসের ওজন"
},

scrap: {
  en: "Scrap",
  bn: "স্ক্র্যাপ"
},

magnet_dashboard: {
  en: "Magnet Dashboard",
  bn: "ম্যাগনেট ড্যাশবোর্ড"
},

magnet_dashboard_subtitle: {
  en: "Club and manage casting batches. Result entry will be done on the process page.",
  bn: "কাস্টিং ব্যাচ ক্লাব ও ম্যানেজ করুন। প্রসেস পেজে রেজাল্ট এন্ট্রি হবে।"
},

magnet_process: {
  en: "Magnet Process",
  bn: "ম্যাগনেট প্রসেস"
},

casting: {
  en: "Casting",
  bn: "কাস্টিং"
},

cancel_club: {
  en: "Cancel Club",
  bn: "ক্লাব বাতিল"
},

club_batches: {
  en: "Club Batches",
  bn: "ব্যাচ ক্লাব করুন"
},

batches: {
  en: "Batches",
  bn: "ব্যাচ"
},

inward: {
  en: "Inward",
  bn: "ইনওয়ার্ড"
},

included_castings: {
  en: "Included Castings",
  bn: "অন্তর্ভুক্ত কাস্টিং"
},

loading_magnet_process: {
  en: "Loading magnet process...",
  bn: "ম্যাগনেট প্রসেস লোড হচ্ছে..."
},

magnet_process_subtitle: {
  en: "Save magnet results for single and clubbed casting batches.",
  bn: "সিঙ্গেল ও ক্লাবড কাস্টিং ব্যাচের ম্যাগনেট রেজাল্ট সংরক্ষণ করুন।"
},

clubbed_magnet_batches: {
  en: "Clubbed Magnet Batches",
  bn: "ক্লাব করা ম্যাগনেট ব্যাচ"
},

no_clubbed_magnet_pending: {
  en: "No clubbed magnet batch pending.",
  bn: "কোনো ক্লাব করা ম্যাগনেট ব্যাচ অপেক্ষায় নেই।"
},

single_casting_batches: {
  en: "Single Casting Batches",
  bn: "সিঙ্গেল কাস্টিং ব্যাচ"
},

no_single_magnet_pending: {
  en: "No single casting batch pending for magnet.",
  bn: "ম্যাগনেটের জন্য কোনো সিঙ্গেল কাস্টিং ব্যাচ অপেক্ষায় নেই।"
},

enter_pieces_or_scrap_weight: {
  en: "Enter pieces weight or scrap weight.",
  bn: "পিসের ওজন অথবা স্ক্র্যাপের ওজন লিখুন।"
},

old_scrap: {
  en: "Old Scrap",
  bn: "পুরনো স্ক্র্যাপ"
},

magnet_result: {
  en: "Magnet Result",
  bn: "ম্যাগনেট রেজাল্ট"
},

pieces_received: {
  en: "Pieces Received",
  bn: "রিসিভ করা পিস"
},

pieces_weight_after_magnet: {
  en: "Pieces Weight After Magnet",
  bn: "ম্যাগনেটের পর পিসের ওজন"
},

scrap_weight_after_magnet: {
  en: "Scrap Weight After Magnet",
  bn: "ম্যাগনেটের পর স্ক্র্যাপের ওজন"
},

total_issued: {
  en: "Total Issued",
  bn: "মোট ইস্যু"
},

received_plus_scrap: {
  en: "Received + Scrap",
  bn: "রিসিভ + স্ক্র্যাপ"
},

final_casting_loss: {
  en: "Final Casting Loss",
  bn: "ফাইনাল কাস্টিং লস"
},

save_magnet_result: {
  en: "Save Magnet Result",
  bn: "ম্যাগনেট রেজাল্ট সেভ"
},

die: {
  en: "Die",
  bn: "ডাই"
},

qty: {
  en: "Qty",
  bn: "পরিমাণ"
},

single_magnet: {
  en: "Single Magnet",
  bn: "সিঙ্গেল ম্যাগনেট"
},

in_magnet: {
  en: "In Magnet",
  bn: "ম্যাগনেটে আছে"
},

magnet_completed: {
  en: "Magnet Completed",
  bn: "ম্যাগনেট সম্পন্ন"
},

magnet_completed: {
  en: "Magnet Completed",
  bn: "ম্যাগনেট সম্পন্ন"
},
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("BOTH");

  useEffect(() => {
    const saved = localStorage.getItem("annvi_lang") || "BOTH";
    setLang(saved);
  }, []);

  function changeLang(nextLang) {
    setLang(nextLang);
    localStorage.setItem("annvi_lang", nextLang);
  }

function t(key) {
  const item = TRANSLATIONS[key];

  if (!item) return key;

  if (lang === "EN") return item.en || key;
  if (lang === "BN") return item.bn || item.en || key;

  return `${item.en || key} / ${item.bn || item.en || key}`;
}

  const value = useMemo(() => ({ lang, setLang: changeLang, t }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

