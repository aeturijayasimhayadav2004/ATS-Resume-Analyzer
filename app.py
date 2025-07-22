from dotenv import load_dotenv
load_dotenv()

import os
import io
import base64
import streamlit as st
from PIL import Image
import pdf2image
import google.generativeai as genai

# Configure Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Function to get Gemini response (Updated for new Gemini API)
def get_gemini_response(prompt, pdf_content, job_desc):
    try:
        # Use the updated Gemini Vision model
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Pass text + image correctly
        response = model.generate_content([
            {"text": prompt},
            {"text": job_desc},
            {"inline_data": pdf_content[0]}  # Send the first page as inline data
        ])
        return response.text
    except Exception as e:
        return f"Error generating response: {e}"

# Convert PDF to image (first page)
@st.cache_data
def input_pdf_setup(uploaded_file):
    if uploaded_file is not None:
        try:
            images = pdf2image.convert_from_bytes(uploaded_file.read())
            first_page = images[0]

            img_byte_arr = io.BytesIO()
            first_page.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()

            # Prepare inline data for Gemini (instead of old base64 approach)
            pdf_parts = [
                {
                    "mime_type": "image/png",
                    "data": img_byte_arr
                }
            ]
            return pdf_parts
        except Exception as e:
            st.error(f"Error processing PDF: {e}")
            return None
    else:
        raise FileNotFoundError("No file uploaded")

# Streamlit app setup
st.set_page_config(page_title="ATS Resume Analyzer", page_icon=":mag_right:")
st.header("ATS Tracking System")

# Inputs
input_text = st.text_area("Job Description: ", key="input")
uploaded_file = st.file_uploader("Upload Resume (PDF):", type=["pdf"])

if uploaded_file is not None:
    st.success("PDF Uploaded Successfully!")

# Buttons
submit1 = st.button("Tell me About the Resume")
submit2 = st.button("Percentage Match with Job Description")

# Prompts
input_prompt1 = """
You are an experienced HR with tech expertise in AI, ML, Data Science, DevOps, Data Engineering, or Software Development. 
Review the resume and job description. Provide a detailed analysis of the candidate’s skills, experience, and qualifications, 
highlighting matches and gaps. Mention if the profile aligns with the role, and list missing skills or experience if any.
"""

input_prompt2 = """
You are a skilled ATS (Applicant Tracking System) analyzer with expertise in Data Science, AI, ML, DevOps, Data Engineering, and Software Development. 
Compare the resume with the job description and return:
1. A percentage match.
2. Missing keywords or skills.
3. Extra keywords found in the resume but not in the job description.
4. If the fit is above 80%, state it's a good fit; otherwise, suggest improvements.
"""

# Actions
if submit1:
    if uploaded_file is not None:
        pdf_content = input_pdf_setup(uploaded_file)
        if pdf_content:
            response = get_gemini_response(input_prompt1, pdf_content, input_text)
            st.subheader("Resume Analysis:")
            st.write(response)
    else:
        st.warning("Please upload a PDF resume to analyze.")

elif submit2:
    if uploaded_file is not None:
        pdf_content = input_pdf_setup(uploaded_file)
        if pdf_content:
            response = get_gemini_response(input_prompt2, pdf_content, input_text)
            st.subheader("ATS Match Result:")
            st.write(response)
    else:
        st.warning("Please upload a PDF resume to analyze.")
