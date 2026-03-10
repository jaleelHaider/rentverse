Project Proposal
1. Introduction 
RentVerse is a web and mobile-based marketplace designed to let users buy, sell, and 
rent items securely and intelligently. Unlike traditional platforms such as OLX or 
Facebook Marketplace, RentVerse introduces a structured rental system, secure 
escrow transactions, and AI-powered tools for smarter and safer experiences. 
The platform aims to make local trading in Pakistan simpler, more trustworthy, and 
technology-driven by combining e-commerce and rentals with artificial intelligence 
and automation. 
2. Problem Statement 
Existing online marketplaces mainly support buying and selling, leaving a huge gap 
for short-term rentals. Users face several issues such as: 
• No structured process for rent booking or security deposits. 
• Lack of secure payments or escrow systems, leading to scams. 
• No AI features for listing quality, categorization, or fraud prevention. 
• Poor customer support or help automation. 
RentVerse addresses these challenges through a safe rental process, AI-assisted 
listing, and integrated escrow simulation, ensuring reliability and convenience for 
both buyers and renters. 
3. Objectives 
1. Develop a marketplace that supports buying, selling, and renting. 
2. Integrate AI-based tools for smart categorization, image verification, and 
chatbot assistance. 
3. Implement a secure escrow payment simulation to reduce fraud risk. 
4. Build a user-friendly and scalable web and mobile interface. 
5. Ensure trust and transparency through verification and rental confirmation 
processes. 
4. Core Features 
 
Feature Description 
Buy & Sell Users can list and browse items for sale. 
Rent Booking Full rental cycle — booking, deposit handling, delivery 
confirmation, and return. 
Escrow System Simulated payment system that holds funds until both sides 
confirm completion. 
KYC Verification Optional ID verification for high-value items to ensure trust. 
Recommendation 
System 
Suggests similar or trending listings to improve user engagement. 
AI Features Auto-categorization, image quality checking, and chatbot assistant 
for user support. 
 
5. Comparison with Existing Platforms 
Competitor / App Buy & 
Sell 
In-app 
Payments 
Rent 
Booking 
KYC / 
Verification Escrow AI 
Features 
Rentkea 
(Pakistan)              
OLX (Pakistan)               
Facebook 
Marketplace               
Quikr               
Fat Llama                 
RentVerse (Our 
App)                   
RentVerse stands out as a complete ecosystem that combines buy, sell, rent, and AI
driven safety features — the first of its kind in Pakistan. 
6. AI Components 
AI Feature 
Purpose 
Dataset Source 
Auto
Categorization 
Automatically detect item category from 
title/description using NLP models. 
Kaggle: Product 
Classification Dataset
Image Quality 
Check 
Detects low-quality or blurry images before 
posting to ensure professional listings. 
Kaggle: Image Quality 
Assessment Dataset
Chatbot 
Assistant 
Provides rental guidance, FAQs, and helps 
with app navigation. 
Kaggle: Chatbot Intent 
Dataset
Each of these AI models will be trained, customized, and integrated via 
Flask/FastAPI, showing both research and development. 
7. System Flow and Process  
1. User posts a rental listing (e.g., Camera). 
2. Renter books the item and deposits the rental fee + refundable security. 
3. Both parties verify item delivery through an OTP or QR code system 
generated within the app. 
4. Escrow holds payment until both confirm completion. 
5. If item returned safely, the system releases payment and deposit automatically. 
6. If disputes arise, the admin panel handles resolution using transaction logs and 
verification data. 
8. Security Measures 
1. KYC Verification: Users can upload CNIC or ID for trust validation. 
2. Escrow Simulation: Payment remains in system custody until both users 
confirm. 
3. OTP Confirmation: Item handover and return are verified using an in-app 
generated code (similar to ride-sharing apps). 
4. Admin Oversight: Admin has the authority to pause, verify, or resolve 
disputes. 
5. User Reputation System: Ratings help identify trusted buyers and renters. 
6. Fraud Prevention: AI can flag suspicious listings or duplicate posts. 
9. Tools and Technologies 
Category 
Frontend (Web) 
Technology 
React.js 
Frontend (Mobile) 
Flutter 
Backend 
Node.js / Express.js 
Database 
MongoDB / Firebase 
AI/ML 
Python (TensorFlow / Scikit-learn) 
API Integration 
Flask / FastAPI for AI modules 
Design & Prototyping 
Figma 
Hosting 
Render / Vercel / Firebase Hosting 
Version Control 
GitHub 
10. Expected Outcomes 
• A fully functional web and mobile marketplace for buy, sell, and rent. 
• Integrated AI features for smarter user experience. 
• A working escrow simulation system to ensure safe transactions. 
• Chatbot support for automated assistance. 
• Practical demonstration of AI + Full-stack development skills. 
11. Future Enhancements 
• AI-based price prediction and fraud detection. 
• Integration with local payment gateways (JazzCash, Easypaisa). 
• User reputation and review system. 
• Optional insurance feature for high-value rentals. 
• Expansion to include property or vehicle rentals. 
12. Conclusion 
RentVerse bridges the gap between e-commerce and rental services through 
innovation, automation, and security. 
It provides a complete, real-world scalable project that demonstrates both research in 
AI and practical software development. 
With its unique rental verification system, escrow simulation, and AI-enhanced 
usability, RentVerse stands as a strong and realistic Project.

Requirement Specifications
3.3.1 Functional Requirements
3.3RequirementSpecifications 13
Table3.1:FunctionalRequirements
ID Requirement Description Core Status
FR-01 UserRegistration Allowregistrationviaemail,phone,
orsocialloginwithverification.
Yes
FR-02 ProfileManagement Maintainuserprofileswithdetails,
photos,andreputationscores.
Yes
FR-03 KYCVerification Provideoptionalidentityverification
fortrusteduserstatus.
No
FR-04 Multi-Type Listing
Creation
Supportcreationofboth"ForSale"
and"ForRent"listings.
Yes
FR-05 Rental-SpecificListing
Fields
Include rental rates, deposit, and
availabilitycalendarforrentalitems.
Yes
FR-06 AI Image Quality
Check
Automaticallyanalyzeandflaglow
qualitylistingimages.
Yes
FR-07 AI Category Sugges
tion
Suggestrelevantcategoriesbasedon
listingtitleanddescription.
No
FR-08 ListingExpiry&Re
newal
Automaticallyexpirelistingsaftera
setperiodunlessrenewed.
No
FR-09 Advanced Search &
Filters
Enablekeywordsearchwithfilters
forprice,location,availability,etc.
Yes
FR-10 AI-Powered Recom
mendations
Suggest listings tousersbasedon
browsingandtransactionbehavior.
No
FR-11 RentalAvailabilityFil
tering
Filterrental listingsbasedonuser
selecteddates.
Yes
FR-12 RentalBookingWork
flow
Managethecompleterentalprocess
fromrequesttocompletion.
Yes
FR-13 Cost&DepositCalcu
lation
Automaticallycalculatetotalrental
cost,deposit,andfees.
Yes
FR-14 HandoverVerification GenerateuniqueOTP/QRcodesfor
secureitemhandoverandreturn.
Yes
FR-15 AutomatedDepositRe
fund
Refund securitydeposit automati
callyaftersuccessfulrentalreturn.
Yes
FR-16 PaymentEscrow Hold transaction funds inescrow
duringactiverentals/sales.
Yes
FR-17 PlatformFeeManage
ment
Calculateanddisplayplatformfees
fortransactions.
No
FR-18 AIChatbotAssistance Providecontextualhelpfor listing
guidance,rentals,andsafety.
No
FR-19 In-AppMessaging Enablereal-timecommunicationbe
tweenusers.
Yes
FR-20 Offer &Negotiation
System
Supportpricenegotiationthroughof
ferandcounter-offermessages.
No
FR-21 UserRatingSystem Allowuserstorateeachotherona
1-5starscaleaftertransactions.
Yes
FR-22 AIFraudDetection Flagsuspiciousactivitylikedupli
catelistingsorunusualpatterns.
Yes
FR-23 AdminDisputeResolu
tion
Provideadminswithtoolsandinfor
mationtomediateuserdisputes.
Yes
FR-24 Admin AI Perfor
manceDashboard
Displaymetrics andperformance
dataforAImodules.
No
FR-25 UserBlockingFeature Allowuserstoblockotherusersto
preventfurthercontact.
Yes
14 RequirementSpecifications
3.3.2 Non-functionalRequirements
Table3.2:Non-FunctionalRequirements
ID Requirement Description Core Status
NFR-01 Performance & Re
sponsiveness
Ensurefast loadtimesandsmooth
interactionsacrossallplatformfunc
tions.
Yes
NFR-02 Cross-PlatformCom
patibility
Maintain consistent functionality
andUIonAndroid,iOS,andWeb.
Yes
NFR-03 SystemSecurity Implement robust authentication,
dataencryption, and input valida
tion.
Yes
NFR-04 DataSafety&Privacy Protect sensitiveuserdataanden
sure secure storage and transmis
sion.
Yes
NFR-05 HighUsability Providean intuitive, user-friendly
interfaceadheringtodesignguide
lines.
Yes
NFR-06 SystemReliability&
Uptime
Ensurehighavailabilityandminimal
servicedowntime.
Yes
NFR-07 Scalability Supportagrowingnumberofcon
currentusersandlistings.
No
NFR-08 Maintainability Useamodular code structure for
easyupdatesandbugfixes.
Yes
NFR-09 Accessibility Supportfeatureslikescreenreaders
andadjustabletextsizes.
No
NFR-10 Monitoring&Analyt
ics
Integrate tools forcrashreporting,
performancemonitoring, anduser
analytics.
No
NFR-11 AutomatedBackups Performregular,automaticbackups
ofcriticalsystemdata.
Yes
NFR-12 CI/CDPipeline Utilize automated testing andde
ploymentprocesses.
No