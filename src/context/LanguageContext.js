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

casting_subtitle: {
  en: "Select a planned tree and calculate metal issue.",
  bn: "একটি পরিকল্পিত ট্রি নির্বাচন করুন এবং মেটাল ইস্যু হিসাব করুন।"
},
casting_dashboard: { en: "Casting Dashboard", bn: "কাস্টিং ড্যাশবোর্ড" },
inventory: { en: "Inventory", bn: "ইনভেন্টরি" },
select_tree: {
  en: "1. Select Tree",
  bn: "১. ট্রি নির্বাচন"
},
select_items: { en: "2. Select Items", bn: "২. আইটেম নির্বাচন" },
batch_details: {
  en: "2. Batch Details",
  bn: "২. ব্যাচ ডিটেইলস"
},
metal_inputs: {
  en: "3. Metal Inputs",
  bn: "৩. মেটাল ইনপুট"
},
fine_gold_calculation: {
  en: "4. Fine Gold Calculation",
  bn: "৪. ফাইন গোল্ড হিসাব"
},
scrap_conversion_calculation: {
  en: "5. Scrap Conversion Calculation",
  bn: "৫. স্ক্র্যাপ কনভার্সন হিসাব"
},
final_total_calculation: {
  en: "6. Final Total Calculation",
  bn: "৬. ফাইনাল টোটাল হিসাব"
},
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

loading_bench_dashboard: {
  en: "Loading bench dashboard...",
  bn: "বেঞ্চ ড্যাশবোর্ড লোড হচ্ছে..."
},

no_bench_batches: {
  en: "No batches in Filing + Assembly + Solder.",
  bn: "ফাইলিং, অ্যাসেম্বলি ও সোল্ডারে কোনো ব্যাচ নেই।"
},

draft_saved: {
  en: "Draft saved",
  bn: "ড্রাফট সেভ হয়েছে"
},

stock_is_low: {
  en: "stock is low",
  bn: "স্টক কম আছে"
},

required: {
  en: "Required",
  bn: "প্রয়োজন"
},

available: {
  en: "Available",
  bn: "উপলব্ধ"
},

received_pieces_weight_required: {
  en: "Received pieces weight is required.",
  bn: "রিসিভ করা পিসের ওজন প্রয়োজন।"
},

filing: {
  en: "Filing",
  bn: "ফাইলিং"
},

issue_weight: {
  en: "Issue Wt",
  bn: "ইস্যু ওজন"
},

findings_issue_receive: {
  en: "Findings Issue / Receive",
  bn: "ফাইন্ডিংস ইস্যু / রিসিভ"
},

add_finding: {
  en: "+ Add Finding",
  bn: "+ ফাইন্ডিং যোগ করুন"
},

issued_by: {
  en: "Issued By",
  bn: "ইস্যু করেছেন"
},

name: {
  en: "Name",
  bn: "নাম"
},

no_findings_issued: {
  en: "No findings issued yet.",
  bn: "এখনও কোনো ফাইন্ডিং ইস্যু করা হয়নি।"
},

finding: {
  en: "Finding",
  bn: "ফাইন্ডিং"
},

select: {
  en: "Select",
  bn: "নির্বাচন করুন"
},

kt: {
  en: "KT",
  bn: "ক্যারেট"
},

issued_quantity: {
  en: "Issued Qty",
  bn: "ইস্যু পরিমাণ"
},

received_quantity: {
  en: "Received Qty",
  bn: "রিসিভ পরিমাণ"
},

findings_issued: {
  en: "Findings Issued",
  bn: "ইস্যু করা ফাইন্ডিংস"
},

findings_received: {
  en: "Findings Received",
  bn: "রিসিভ করা ফাইন্ডিংস"
},

save_edit_findings: {
  en: "Save / Edit Findings",
  bn: "ফাইন্ডিংস সেভ / এডিট করুন"
},

bench_result: {
  en: "Filing + Assembly + Solder Result",
  bn: "ফাইলিং + অ্যাসেম্বলি + সোল্ডার রেজাল্ট"
},

karigar_name: {
  en: "Karigar Name",
  bn: "কারিগরের নাম"
},

issued_pieces_weight: {
  en: "Issued Pieces Weight",
  bn: "ইস্যু করা পিসের ওজন"
},

received_pieces: {
  en: "Received Pieces",
  bn: "রিসিভ করা পিস"
},

received_pieces_weight: {
  en: "Received Pieces Weight",
  bn: "রিসিভ করা পিসের ওজন"
},

ghis_weight_received: {
  en: "Ghis Weight Received",
  bn: "রিসিভ করা ঘিসের ওজন"
},

broken_pieces: {
  en: "Broken Pieces",
  bn: "ভাঙা পিস"
},

rejected_weight: {
  en: "Rejected Weight",
  bn: "রিজেক্টেড ওজন"
},

filing_loss: {
  en: "Filing Loss",
  bn: "ফাইলিং লস"
},

filing_loss_formula: {
  en: "Filing Loss = (Pieces Issued Wt + Findings Issued Wt) - (Pieces Received Wt + Findings Received Wt + Ghis Wt + Rejected Wt)",
  bn: "ফাইলিং লস = (ইস্যু পিসের ওজন + ইস্যু ফাইন্ডিংসের ওজন) - (রিসিভ পিসের ওজন + রিসিভ ফাইন্ডিংসের ওজন + ঘিসের ওজন + রিজেক্টেড ওজন)"
},

saving_draft: {
  en: "Saving Draft...",
  bn: "ড্রাফট সেভ হচ্ছে..."
},

move_to_pre_polish: {
  en: "Move To Pre Polish",
  bn: "প্রি-পলিশে পাঠান"
},

filing_assembly_solder: {
  en: "Filing + Assembly + Solder",
  bn: "ফাইলিং + অ্যাসেম্বলি + সোল্ডার"
},

bench_dashboard_subtitle: {
  en: "Findings issue, ghis recovery and bench loss tracking.",
  bn: "ফাইন্ডিংস ইস্যু, ঘিস রিকভারি এবং বেঞ্চ লস ট্র্যাকিং।"
},

magnet: {
  en: "Magnet",
  bn: "ম্যাগনেট"
},

loading_pre_polish: {
  en: "Loading Pre Polish...",
  bn: "প্রি-পলিশ লোড হচ্ছে..."
},

no_pre_polish_batches: {
  en: "No batches in Pre Polish.",
  bn: "প্রি-পলিশে কোনো ব্যাচ নেই।"
},

casting_scrap_not_found: {
  en: "Casting Scrap item was not found in inventory.",
  bn: "ইনভেন্টরিতে কাস্টিং স্ক্র্যাপ আইটেম পাওয়া যায়নি।"
},

enter_pre_polish_weight: {
  en: "Enter at least one Good, Repair or Rejected weight.",
  bn: "গুড, রিপেয়ার অথবা রিজেক্টেড ওজনের মধ্যে অন্তত একটি লিখুন।"
},

active_buff_bag_not_found: {
  en: "Active Buff Bag not found. Install a Buff Bag first.",
  bn: "অ্যাক্টিভ বাফ ব্যাগ পাওয়া যায়নি। আগে একটি বাফ ব্যাগ ইনস্টল করুন।"
},

kt_formula_not_found: {
  en: "KT formula not found",
  bn: "ক্যারেট ফর্মুলা পাওয়া যায়নি"
},

pre_polish: {
  en: "Pre Polish",
  bn: "প্রি-পলিশ"
},

pre_polish_entry: {
  en: "Pre Polish Entry",
  bn: "প্রি-পলিশ এন্ট্রি"
},

electro_polish: {
  en: "Electro Polish",
  bn: "ইলেক্ট্রো পলিশ"
},

two_c_polish: {
  en: "2C Polish",
  bn: "২সি পলিশ"
},

to_final_repair: {
  en: "To Final Repair",
  bn: "ফাইনাল রিপেয়ারে"
},

good_for_next: {
  en: "Good For Next",
  bn: "পরবর্তী ধাপের জন্য ভালো"
},

rejected_to_scrap: {
  en: "Rejected To Scrap",
  bn: "রিজেক্টেড স্ক্র্যাপে"
},

pcs: {
  en: "pcs",
  bn: "পিস"
},

pre_polish_loss_formula: {
  en: "Loss = Issued Weight - Good Weight - Repair Weight - Rejected Weight",
  bn: "লস = ইস্যু ওজন - গুড ওজন - রিপেয়ার ওজন - রিজেক্টেড ওজন"
},

save_move_final_repair: {
  en: "Save & Move To Final Repair",
  bn: "সেভ করে ফাইনাল রিপেয়ারে পাঠান"
},

pre_polish_subtitle: {
  en: "Electro Polish / 2C Polish, rejection, repair queue and loss tracking.",
  bn: "ইলেক্ট্রো পলিশ / ২সি পলিশ, রিজেকশন, রিপেয়ার কিউ এবং লস ট্র্যাকিং।"
},

loading_final_repair: {
  en: "Loading final repair...",
  bn: "ফাইনাল রিপেয়ার লোড হচ্ছে..."
},

no_pending_final_repair: {
  en: "No pending final repair.",
  bn: "কোনো ফাইনাল রিপেয়ার পেন্ডিং নেই।"
},

received_weight_required: {
  en: "Received weight is required.",
  bn: "রিসিভ করা ওজন প্রয়োজন।"
},

final_repair: {
  en: "Final Repair",
  bn: "ফাইনাল রিপেয়ার"
},

pending_pieces: {
  en: "Pending Pcs",
  bn: "পেন্ডিং পিস"
},

pending_weight: {
  en: "Pending Wt",
  bn: "পেন্ডিং ওজন"
},

sources: {
  en: "Sources",
  bn: "সোর্স"
},

no_repair_required: {
  en: "No Repair Required",
  bn: "রিপেয়ার প্রয়োজন নেই"
},

bench: {
  en: "Bench",
  bn: "বেঞ্চ"
},

stone_setting: {
  en: "Stone Setting",
  bn: "স্টোন সেটিং"
},

repair_result: {
  en: "Repair Result",
  bn: "রিপেয়ার রেজাল্ট"
},

calculated_loss: {
  en: "Calculated Loss",
  bn: "হিসাব করা লস"
},

loss_breakup_total: {
  en: "Loss Breakup Total",
  bn: "মোট লস ব্রেকআপ"
},

loss_type_breakup: {
  en: "Loss Type Breakup",
  bn: "লস টাইপ ব্রেকআপ"
},

add_loss_type: {
  en: "+ Add Loss Type",
  bn: "+ লস টাইপ যোগ করুন"
},

ghis: {
  en: "Ghis",
  bn: "ঘিস"
},

buff_loss: {
  en: "Buff Loss",
  bn: "বাফ লস"
},

electropolishing_loss: {
  en: "Electropolishing Loss",
  bn: "ইলেক্ট্রোপলিশিং লস"
},

repair_loss_formula: {
  en: "Repair Loss = (Issued Weight + Findings Issued) - (Received Weight + Findings Received + Rejected Weight)",
  bn: "রিপেয়ার লস = (ইস্যু ওজন + ইস্যু ফাইন্ডিংস) - (রিসিভ ওজন + রিসিভ ফাইন্ডিংস + রিজেক্টেড ওজন)"
},

save_move_stone_setting: {
  en: "Save & Move To Stone Setting",
  bn: "সেভ করে স্টোন সেটিংয়ে পাঠান"
},

final_repair_subtitle: {
  en: "Combined repair queue, findings issue/receive and loss breakup.",
  bn: "কম্বাইন্ড রিপেয়ার কিউ, ফাইন্ডিংস ইস্যু/রিসিভ এবং লস ব্রেকআপ।"
},

loading_stone_setting: {
  en: "Loading stone setting...",
  bn: "স্টোন সেটিং লোড হচ্ছে..."
},

no_stone_setting_batches: {
  en: "No batches in Stone Setting.",
  bn: "স্টোন সেটিং-এ কোনো ব্যাচ নেই।"
},

enter_stone_setting_weight: {
  en: "Enter received, repair or rejected weight.",
  bn: "রিসিভ, রিপেয়ার অথবা রিজেক্টেড ওজন লিখুন।"
},

stone_issue_receive: {
  en: "Stone Issue / Receive",
  bn: "স্টোন ইস্যু / রিসিভ"
},

add_stone: {
  en: "+ Add Stone",
  bn: "+ স্টোন যোগ করুন"
},

no_stones_issued: {
  en: "No stones issued yet.",
  bn: "এখনও কোনো স্টোন ইস্যু করা হয়নি।"
},

stone: {
  en: "Stone",
  bn: "স্টোন"
},

stone_type: {
  en: "Stone Type",
  bn: "স্টোন টাইপ"
},

stone_size: {
  en: "Stone Size",
  bn: "স্টোন সাইজ"
},

stone_issued_weight: {
  en: "Stone Issued Weight",
  bn: "স্টোন ইস্যু ওজন"
},

stone_received_weight: {
  en: "Stone Received Weight",
  bn: "স্টোন রিসিভ ওজন"
},

stone_increased: {
  en: "Stone Increased",
  bn: "স্টোন বৃদ্ধি"
},

select_stone: {
  en: "Select Stone",
  bn: "স্টোন নির্বাচন করুন"
},

stone_issued: {
  en: "Stone Issued",
  bn: "স্টোন ইস্যু"
},

stone_received: {
  en: "Stone Received",
  bn: "স্টোন রিসিভ"
},

stone_setting_challan: {
  en: "Stone Setting Challan",
  bn: "স্টোন সেটিং চালান"
},

setter_name: {
  en: "Setter Name",
  bn: "সেটারের নাম"
},

gold_issued_weight: {
  en: "Gold Issued Weight",
  bn: "সোনার ইস্যু ওজন"
},

gold_received_weight: {
  en: "Gold Received Weight",
  bn: "সোনার রিসিভ ওজন"
},

good_to_buff: {
  en: "Good To Buff",
  bn: "বাফে যাবে"
},

repair_received: {
  en: "Repair Received",
  bn: "রিপেয়ার রিসিভ"
},

rejected_scrap: {
  en: "Rejected Scrap",
  bn: "রিজেক্টেড স্ক্র্যাপ"
},

stone_setting_formula: {
  en: "Stone Setting Challan = Gold Issued + Stone Issued - Gold Received - Stone Received - Rejected - Repair Issued",
  bn: "স্টোন সেটিং চালান = ইস্যু সোনা + ইস্যু স্টোন - রিসিভ সোনা - রিসিভ স্টোন - রিজেক্টেড - রিপেয়ার ইস্যু"
},

save_move_buff: {
  en: "Save & Move To Buff",
  bn: "সেভ করে বাফে পাঠান"
},

repair_handling: {
  en: "Repair Handling",
  bn: "রিপেয়ার হ্যান্ডলিং"
},

repair_issued_pieces: {
  en: "Repair Issued Pieces",
  bn: "রিপেয়ার ইস্যু পিস"
},

repair_issued_weight: {
  en: "Repair Issued Weight",
  bn: "রিপেয়ার ইস্যু ওজন"
},

repair_received_pieces: {
  en: "Repair Received Pieces",
  bn: "রিপেয়ার রিসিভ পিস"
},

repair_received_weight: {
  en: "Repair Received Weight",
  bn: "রিপেয়ার রিসিভ ওজন"
},

repair_loss: {
  en: "Repair Loss",
  bn: "রিপেয়ার লস"
},

select_finding: {
  en: "Select Finding",
  bn: "ফাইন্ডিং নির্বাচন করুন"
},

add_loss: {
  en: "+ Add Loss",
  bn: "+ লস যোগ করুন"
},

no_repair_loss: {
  en: "No repair loss added.",
  bn: "এখনও কোনো রিপেয়ার লস যোগ করা হয়নি।"
},

loss_type: {
  en: "Loss Type",
  bn: "লস টাইপ"
},

select_loss_type: {
  en: "Select Loss Type",
  bn: "লস টাইপ নির্বাচন করুন"
},

stone_setting_loss: {
  en: "Stone Setting Loss",
  bn: "স্টোন সেটিং লস"
},

other: {
  en: "Other",
  bn: "অন্যান্য"
},

repair_formula: {
  en: "Repair Loss = Repair Issued Weight + Findings Issued - Repair Received Weight - Findings Received",
  bn: "রিপেয়ার লস = রিপেয়ার ইস্যু ওজন + ইস্যু ফাইন্ডিংস - রিপেয়ার রিসিভ ওজন - রিসিভ ফাইন্ডিংস"
},

stone_setting_subtitle: {
  en: "Stone issue, receive, repair handling and challan tracking.",
  bn: "স্টোন ইস্যু, রিসিভ, রিপেয়ার হ্যান্ডলিং এবং চালান ট্র্যাকিং।"
},

repair: {
  en: "Repair",
  bn: "রিপেয়ার"
},

loading_buff: {
  en: "Loading Buff Process...",
  bn: "বাফ প্রসেস লোড হচ্ছে..."
},

no_buff_batches: {
  en: "No batches in Buff.",
  bn: "বাফে কোনো ব্যাচ নেই।"
},

enter_buff_weight: {
  en: "Enter received, repair or rejected weight.",
  bn: "রিসিভ, রিপেয়ার অথবা রিজেক্টেড ওজন লিখুন।"
},

buff: {
  en: "Buff",
  bn: "বাফ"
},

buff_final_polish_result: {
  en: "Buff / Final Polish Result",
  bn: "বাফ / ফাইনাল পলিশ রেজাল্ট"
},

polisher_name: {
  en: "Polisher Name",
  bn: "পলিশারের নাম"
},

buff_loss: {
  en: "Buff Loss",
  bn: "বাফ লস"
},

buff_loss_percent: {
  en: "Buff Loss %",
  bn: "বাফ লস %"
},

expected_fine_gold: {
  en: "Expected Fine Gold",
  bn: "প্রত্যাশিত বিশুদ্ধ সোনা"
},

active_buff_bag: {
  en: "Active Buff Bag",
  bn: "অ্যাক্টিভ বাফ ব্যাগ"
},

no_active_bag: {
  en: "No Active Bag",
  bn: "কোনো অ্যাক্টিভ ব্যাগ নেই"
},

good_to_qc: {
  en: "Good To QC",
  bn: "QC-তে যাবে"
},

buff_formula: {
  en: "Buff Loss = Issued Weight - Received Weight - Rejected Weight - Repair Issued Weight",
  bn: "বাফ লস = ইস্যু ওজন - রিসিভ ওজন - রিজেক্টেড ওজন - রিপেয়ার ইস্যু ওজন"
},

save_move_final_qc: {
  en: "Save & Move To Final QC",
  bn: "সেভ করে ফাইনাল QC-তে পাঠান"
},

buff_subtitle: {
  en: "Buff result, repair handling, findings and loss tracking.",
  bn: "বাফ রেজাল্ট, রিপেয়ার হ্যান্ডলিং, ফাইন্ডিংস এবং লস ট্র্যাকিং।"
},

current_pieces: {
  en: "Current Pieces",
  bn: "বর্তমান পিস"
},

current_weight: {
  en: "Current Weight",
  bn: "বর্তমান ওজন"
},

received_weight: {
  en: "Received Weight",
  bn: "রিসিভ ওজন"
},

loading_final_qc: {
  en: "Loading Final QC...",
  bn: "ফাইনাল QC লোড হচ্ছে..."
},

no_final_qc_batches: {
  en: "No batches in Final QC.",
  bn: "ফাইনাল QC-তে কোনো ব্যাচ নেই।"
},

enter_final_qc_weight: {
  en: "Enter passed, repair or rejected weight.",
  bn: "পাস, রিপেয়ার অথবা রিজেক্টেড ওজন লিখুন।"
},

final_qc: {
  en: "Final QC",
  bn: "ফাইনাল QC"
},

final_qc_result: {
  en: "Final QC / Inspection Result",
  bn: "ফাইনাল QC / ইন্সপেকশন রেজাল্ট"
},

inspector_name: {
  en: "Inspector Name",
  bn: "ইন্সপেক্টরের নাম"
},

passed: {
  en: "Passed",
  bn: "পাস"
},

rejected: {
  en: "Rejected",
  bn: "রিজেক্টেড"
},

passed_pieces: {
  en: "Passed Pieces",
  bn: "পাস পিস"
},

passed_weight: {
  en: "Passed Weight",
  bn: "পাস ওজন"
},

qc_difference: {
  en: "QC Difference",
  bn: "QC পার্থক্য"
},

passed_to_rhodium: {
  en: "Passed To Rhodium",
  bn: "রোডিয়ামে যাবে"
},

repair_queue: {
  en: "Repair Queue",
  bn: "রিপেয়ার কিউ"
},

qc_formula: {
  en: "QC Difference = Issued Weight - Passed Weight - Repair Weight - Rejected Weight",
  bn: "QC পার্থক্য = ইস্যু ওজন - পাস ওজন - রিপেয়ার ওজন - রিজেক্টেড ওজন"
},

continue_save: {
  en: "Do you still want to save?",
  bn: "তবুও কি সেভ করতে চান?"
},

redirecting_rhodium: {
  en: "Redirecting to Rhodium...",
  bn: "রোডিয়ামে নিয়ে যাওয়া হচ্ছে..."
},

save_move_rhodium: {
  en: "Save & Move To Rhodium",
  bn: "সেভ করে রোডিয়ামে পাঠান"
},

final_qc_subtitle: {
  en: "Inspection pass, repair, rejection and QC difference tracking.",
  bn: "ইন্সপেকশন, রিপেয়ার, রিজেকশন এবং QC পার্থক্য ট্র্যাকিং।"
},

loading_rhodium: {
  en: "Loading Rhodium / Plating...",
  bn: "রোডিয়াম / প্লেটিং লোড হচ্ছে..."
},

no_rhodium_batches: {
  en: "No batches in Rhodium / Plating.",
  bn: "রোডিয়াম / প্লেটিং-এ কোনো ব্যাচ নেই।"
},

enter_rhodium_weight: {
  en: "Enter received or rejected weight.",
  bn: "রিসিভ অথবা রিজেক্টেড ওজন লিখুন।"
},

rhodium_plating: {
  en: "Rhodium / Plating",
  bn: "রোডিয়াম / প্লেটিং"
},

rhodium_plating_result: {
  en: "Rhodium / Plating Result",
  bn: "রোডিয়াম / প্লেটিং রেজাল্ট"
},

operator_name: {
  en: "Operator Name",
  bn: "অপারেটরের নাম"
},

rhodium_difference: {
  en: "Rhodium Difference",
  bn: "রোডিয়াম পার্থক্য"
},

ready_pieces: {
  en: "Ready Pieces",
  bn: "রেডি পিস"
},

rhodium_formula: {
  en: "Rhodium Difference = Issued Weight - Received Weight - Rejected Weight",
  bn: "রোডিয়াম পার্থক্য = ইস্যু ওজন - রিসিভ ওজন - রিজেক্টেড ওজন"
},

save_move_ready: {
  en: "Save & Move To Ready",
  bn: "সেভ করে রেডিতে পাঠান"
},

rhodium_subtitle: {
  en: "Rhodium receive, rejection and ready tracking.",
  bn: "রোডিয়াম রিসিভ, রিজেকশন এবং রেডি ট্র্যাকিং।"
},

linked_casting_batch_not_found: {
  en: "Linked casting batch was not found for this order.",
  bn: "এই অর্ডারের সঙ্গে যুক্ত কাস্টিং ব্যাচ পাওয়া যায়নি।"
},

no_rhodium_received_pieces: {
  en: "No Rhodium received pieces were found in this order.",
  bn: "এই অর্ডারে রোডিয়াম রিসিভ করা কোনো পিস পাওয়া যায়নি।"
},

gross_weight_required: {
  en: "Gross weight is required.",
  bn: "গ্রস ওজন প্রয়োজন।"
},

karat_required: {
  en: "Karat is required.",
  bn: "ক্যারেট প্রয়োজন।"
},

print_failed: {
  en: "Print failed.",
  bn: "প্রিন্ট ব্যর্থ হয়েছে।"
},

tag_printed_inventory_created: {
  en: "Tag printed and inventory created.",
  bn: "ট্যাগ প্রিন্ট হয়েছে এবং ইনভেন্টরি তৈরি হয়েছে।"
},

print_bridge_not_running: {
  en: "Print bridge is not running. Start node print-bridge.js first.",
  bn: "প্রিন্ট ব্রিজ চলছে না। আগে node print-bridge.js চালু করুন।"
},

loading_tag_print: {
  en: "Loading tag print...",
  bn: "ট্যাগ প্রিন্ট লোড হচ্ছে..."
},

tag_printing: {
  en: "Tag Printing",
  bn: "ট্যাগ প্রিন্টিং"
},

tag_printing_subtitle: {
  en: "Completed orders, live scale weight and Godex tag printing.",
  bn: "কমপ্লিটেড অর্ডার, লাইভ স্কেল ওজন এবং Godex ট্যাগ প্রিন্টিং।"
},

live_scale: {
  en: "Live Scale",
  bn: "লাইভ স্কেল"
},

completed_orders: {
  en: "Completed Orders",
  bn: "কমপ্লিটেড অর্ডার"
},

completed: {
  en: "Completed",
  bn: "সম্পন্ন"
},

no_completed_orders: {
  en: "No ready or completed orders were found.",
  bn: "কোনো রেডি অথবা কমপ্লিটেড অর্ডার পাওয়া যায়নি।"
},

select_order: {
  en: "Select an order.",
  bn: "একটি অর্ডার নির্বাচন করুন।"
},

total_pieces: {
  en: "Total Pieces",
  bn: "মোট পিস"
},

total_weight: {
  en: "Total Weight",
  bn: "মোট ওজন"
},

piece: {
  en: "Piece",
  bn: "পিস"
},

print_tag: {
  en: "Print Tag",
  bn: "ট্যাগ প্রিন্ট করুন"
},

qr: {
  en: "QR",
  bn: "QR"
},

brand: {
  en: "Brand",
  bn: "ব্র্যান্ড"
},

karat: {
  en: "Karat",
  bn: "ক্যারেট"
},

gross_weight: {
  en: "Gross Weight",
  bn: "গ্রস ওজন"
},

scale: {
  en: "Scale",
  bn: "স্কেল"
},

less_weight: {
  en: "Less Weight",
  bn: "লেস ওজন"
},

stone_charges: {
  en: "Stone Charges",
  bn: "স্টোন চার্জ"
},

net_weight: {
  en: "Net Weight",
  bn: "নেট ওজন"
},

tag_id: {
  en: "Tag ID",
  bn: "ট্যাগ আইডি"
},

draft_save_failed: {
  en: "Draft could not be saved.",
  bn: "ড্রাফট সংরক্ষণ করা যায়নি।"
},

  // =========================================================
  // TREE PLANNING
  // =========================================================

  tree_planning: {
    en: "Tree Planning",
    bn: "ট্রি প্ল্যানিং",
  },

  tree_planning_subtitle: {
    en: "Combine multiple orders, split item quantities and prepare wax trees before burnout.",
    bn: "একাধিক অর্ডার একসাথে নিয়ে আইটেম ভাগ করে বার্নআউটের আগে ট্রি প্রস্তুত করুন।",
  },

  select_combine_orders: {
    en: "Select & Combine Orders",
    bn: "অর্ডার নির্বাচন ও একত্রিত করুন",
  },

  select_combine_orders_subtitle: {
    en: "Select one or multiple orders. Items from all selected orders will appear in one combined pool.",
    bn: "এক বা একাধিক অর্ডার নির্বাচন করুন। নির্বাচিত সব অর্ডারের আইটেম একটি তালিকায় দেখা যাবে।",
  },

  selected: {
    en: "Selected",
    bn: "নির্বাচিত",
  },

  search_order_placeholder: {
    en: "Search order no, party, mobile or status...",
    bn: "অর্ডার নম্বর, পার্টি, মোবাইল বা স্ট্যাটাস খুঁজুন...",
  },

  combined_orders: {
    en: "Combined Orders",
    bn: "একত্রিত অর্ডার",
  },

  combined_orders_subtitle: {
    en: "These orders can be placed together in the same tree.",
    bn: "এই অর্ডারগুলো একই ট্রিতে রাখা যাবে।",
  },

  no_available_orders: {
    en: "No available orders found.",
    bn: "কোনো উপলব্ধ অর্ডার পাওয়া যায়নি।",
  },

  available_orders_hint: {
    en: "Orders with available quantities will appear here.",
    bn: "যেসব অর্ডারে বাকি পরিমাণ আছে সেগুলো এখানে দেখা যাবে।",
  },

  items: {
    en: "Items",
    bn: "আইটেম",
  },

  ordered: {
    en: "Ordered",
    bn: "অর্ডার করা",
  },

  allocated: {
    en: "Allocated",
    bn: "বরাদ্দ",
  },

  remaining: {
    en: "Remaining",
    bn: "বাকি",
  },

  order_items: {
    en: "Order Items",
    bn: "অর্ডার আইটেম",
  },

  select_all_remaining: {
    en: "Select All Remaining",
    bn: "সব বাকি নির্বাচন করুন",
  },

  remove_all: {
    en: "Remove All",
    bn: "সব সরান",
  },

  no_items_in_order: {
    en: "No items found in this order.",
    bn: "এই অর্ডারে কোনো আইটেম পাওয়া যায়নি।",
  },

  used: {
    en: "Used",
    bn: "ব্যবহৃত",
  },

  tree_qty: {
    en: "Tree Qty",
    bn: "ট্রি পরিমাণ",
  },

  maximum: {
    en: "Maximum",
    bn: "সর্বোচ্চ",
  },

  combined_item_pool: {
    en: "Combined Item Pool",
    bn: "সম্মিলিত আইটেম তালিকা",
  },

  combined_item_pool_subtitle: {
    en: "Items from every selected order appear together. Select full or partial quantity for this tree.",
    bn: "নির্বাচিত সব অর্ডারের আইটেম একসাথে দেখা যাবে। এই ট্রির জন্য সম্পূর্ণ বা আংশিক পরিমাণ নির্বাচন করুন।",
  },

  select_orders_first_tree: {
    en: "Select one or more orders first.",
    bn: "আগে এক বা একাধিক অর্ডার নির্বাচন করুন।",
  },

  combine_orders_hint: {
    en: "You can combine items from multiple orders in one tree.",
    bn: "একটি ট্রিতে একাধিক অর্ডারের আইটেম একত্রিত করতে পারবেন।",
  },

  search_item_placeholder: {
    en: "Search category, sample ID, die no, party...",
    bn: "ক্যাটাগরি, স্যাম্পল আইডি, ডাই নম্বর বা পার্টি খুঁজুন...",
  },

  available_qty: {
    en: "Available Qty",
    bn: "উপলব্ধ পরিমাণ",
  },

  party: {
    en: "Party",
    bn: "পার্টি",
  },

  item: {
    en: "Item",
    bn: "আইটেম",
  },

  approx_wt: {
    en: "Approx Wt.",
    bn: "আনুমানিক ওজন",
  },

  add_item: {
    en: "+ Add",
    bn: "+ যোগ করুন",
  },

  tree_details: {
    en: "Tree Details",
    bn: "ট্রি ডিটেইলস",
  },

  tree_details_subtitle: {
    en: "Enter tree, flask, burnout and allocation details.",
    bn: "ট্রি, ফ্লাস্ক, বার্নআউট এবং বরাদ্দের তথ্য লিখুন।",
  },

  update_tree_subtitle: {
    en: "Update the selected tree and its item allocation.",
    bn: "নির্বাচিত ট্রি এবং আইটেম বরাদ্দ আপডেট করুন।",
  },

  editing: {
    en: "Editing",
    bn: "এডিট হচ্ছে",
  },

  new_tree: {
    en: "New Tree",
    bn: "নতুন ট্রি",
  },

  orders_in_tree: {
    en: "Orders in this Tree",
    bn: "এই ট্রিতে অর্ডার",
  },

  orders_in_tree_subtitle: {
    en: "Multiple orders can be combined in one wax tree.",
    bn: "একটি ওয়াক্স ট্রিতে একাধিক অর্ডার একত্রিত করা যাবে।",
  },

  tree_no: {
    en: "Tree No",
    bn: "ট্রি নম্বর",
  },

  flask_no: {
    en: "Flask No",
    bn: "ফ্লাস্ক নম্বর",
  },

  tree_kt: {
    en: "Tree KT",
    bn: "ট্রি ক্যারেট",
  },

  tree_weight: {
    en: "Tree Weight",
    bn: "ট্রি ওজন",
  },

  use_approx: {
    en: "Use Approx",
    bn: "আনুমানিক ওজন নিন",
  },

  tree_date: {
    en: "Tree Date",
    bn: "ট্রি তারিখ",
  },

  burnout_date: {
    en: "Burnout Date",
    bn: "বার্নআউট তারিখ",
  },

  optional: {
    en: "Optional",
    bn: "ঐচ্ছিক",
  },

  tree_remarks_placeholder: {
    en: "Tree preparation, wax, flask or burnout notes...",
    bn: "ট্রি প্রস্তুতি, ওয়াক্স, ফ্লাস্ক বা বার্নআউটের মন্তব্য...",
  },

  selected_tree_items: {
    en: "Selected Tree Items",
    bn: "নির্বাচিত ট্রি আইটেম",
  },

  selected_tree_items_subtitle: {
    en: "Verify selected item quantities before saving the tree.",
    bn: "ট্রি সেভ করার আগে নির্বাচিত আইটেমের পরিমাণ যাচাই করুন।",
  },

  no_items_selected: {
    en: "No items selected.",
    bn: "কোনো আইটেম নির্বাচন করা হয়নি।",
  },

  select_items_left: {
    en: "Select items from one or multiple orders on the left.",
    bn: "বাম পাশ থেকে এক বা একাধিক অর্ডারের আইটেম নির্বাচন করুন।",
  },

  sample: {
    en: "Sample",
    bn: "স্যাম্পল",
  },

  die: {
    en: "Die",
    bn: "ডাই",
  },

  selected_qty: {
    en: "Selected Qty",
    bn: "নির্বাচিত পরিমাণ",
  },

  approx_weight_each: {
    en: "Approx Weight Each",
    bn: "প্রতি পিস আনুমানিক ওজন",
  },

  approx_total_weight: {
    en: "Approx Total Weight",
    bn: "মোট আনুমানিক ওজন",
  },

  from_order_item: {
    en: "From order item",
    bn: "অর্ডার আইটেম থেকে",
  },

  qty_approx_formula: {
    en: "Qty × Approx weight",
    bn: "পরিমাণ × আনুমানিক ওজন",
  },

  tree_summary: {
    en: "Tree Summary",
    bn: "ট্রি সামারি",
  },

  tree_summary_subtitle: {
    en: "Final allocation summary before saving the tree.",
    bn: "ট্রি সেভ করার আগে চূড়ান্ত বরাদ্দের সারাংশ।",
  },

  item_lines: {
    en: "Item Lines",
    bn: "আইটেম লাইন",
  },

  total_quantity: {
    en: "Total Quantity",
    bn: "মোট পরিমাণ",
  },

  save_as_planned: {
    en: "Save as Planned",
    bn: "প্ল্যানড হিসেবে সেভ",
  },

  update_tree: {
    en: "Update Tree",
    bn: "ট্রি আপডেট",
  },

  cancel_edit: {
    en: "Cancel Edit",
    bn: "এডিট বাতিল",
  },

  existing_trees: {
    en: "Existing Trees",
    bn: "বর্তমান ট্রি তালিকা",
  },

  existing_trees_subtitle: {
    en: "Search, review, edit or move planned trees to burnout and casting.",
    bn: "ট্রি খুঁজুন, দেখুন, এডিট করুন অথবা বার্নআউট ও কাস্টিংয়ে পাঠান।",
  },

  trees: {
    en: "Trees",
    bn: "ট্রি",
  },

  burnout: {
    en: "Burnout",
    bn: "বার্নআউট",
  },

  search_tree_placeholder: {
    en: "Search Tree No, Flask No, Order No or Party...",
    bn: "ট্রি নম্বর, ফ্লাস্ক নম্বর, অর্ডার নম্বর বা পার্টি খুঁজুন...",
  },

  all_statuses: {
    en: "All Statuses",
    bn: "সব স্ট্যাটাস",
  },

  total_trees: {
    en: "Total Trees",
    bn: "মোট ট্রি",
  },

  total_tree_weight: {
    en: "Total Tree Weight",
    bn: "মোট ট্রি ওজন",
  },

  no_trees_found: {
    en: "No trees found.",
    bn: "কোনো ট্রি পাওয়া যায়নি।",
  },

  no_trees_hint: {
    en: "Create a tree or change the search and status filter.",
    bn: "নতুন ট্রি তৈরি করুন অথবা সার্চ ও স্ট্যাটাস ফিল্টার পরিবর্তন করুন।",
  },

  flask: {
    en: "Flask",
    bn: "ফ্লাস্ক",
  },

  actions: {
    en: "Actions",
    bn: "অ্যাকশন",
  },

  currently_editing: {
    en: "Currently Editing",
    bn: "বর্তমানে এডিট হচ্ছে",
  },

  deleting: {
    en: "Deleting...",
    bn: "ডিলিট হচ্ছে...",
  },

  view_items: {
    en: "View Items",
    bn: "আইটেম দেখুন",
  },

  hide_items: {
    en: "Hide Items",
    bn: "আইটেম লুকান",
  },

  total_qty: {
    en: "Total Qty",
    bn: "মোট পরিমাণ",
  },

  approx_total: {
    en: "Approx Total",
    bn: "মোট আনুমানিক",
  },

  select_tree_first: {
  en: "Select a tree first.",
  bn: "আগে একটি ট্রি নির্বাচন করুন।"
},

no_casting_trees: {
  en: "No planned tree is available for casting.",
  bn: "কাস্টিংয়ের জন্য কোনো পরিকল্পিত ট্রি উপলব্ধ নেই।"
},

no_casting_trees_hint: {
  en: "Prepare a tree in Tree Planning or change its status to Burnout or Ready For Casting.",
  bn: "ট্রি প্ল্যানিংয়ে একটি ট্রি তৈরি করুন অথবা তার স্ট্যাটাস বার্নআউট বা রেডি ফর কাস্টিং করুন।"
},

tree_items: {
  en: "Tree Items",
  bn: "ট্রি আইটেম"
},

tree_orders: {
  en: "Orders in Tree",
  bn: "ট্রিতে অর্ডার"
},

flask_no: {
  en: "Flask No",
  bn: "ফ্লাস্ক নম্বর"
},

tree_selected: {
  en: "Tree Selected",
  bn: "ট্রি নির্বাচিত"
},

tree_weight_auto: {
  en: "Loaded automatically from Tree Planning.",
  bn: "ট্রি প্ল্যানিং থেকে স্বয়ংক্রিয়ভাবে লোড হয়েছে।"
},

tree_already_used: {
  en: "This tree has already been used for casting.",
  bn: "এই ট্রিটি ইতিমধ্যে কাস্টিংয়ের জন্য ব্যবহার করা হয়েছে।"
},

tree_has_no_items: {
  en: "The selected tree has no allocated items.",
  bn: "নির্বাচিত ট্রিতে কোনো বরাদ্দ করা আইটেম নেই।"
},

select_tree: {
  en: "Select Tree",
  bn:  "ট্রি নির্বাচন"
},

tree_weight_auto: {
  en:"Auto loaded from selected tree",
  bn: "নির্বাচিত ট্রি থেকে স্বয়ংক্রিয়ভাবে লোড হয়েছে"
},

manufacturing_dashboard: {
  en: "Manufacturing Dashboard",
  bn: "ম্যানুফ্যাকচারিং ড্যাশবোর্ড"
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

