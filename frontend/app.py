import streamlit as st
import requests
from io import BytesIO
from st_audiorec import st_audiorec
from urllib.parse import urljoin
from typing import Optional

# --- Configuration ---
st.set_page_config(page_title="AI Health Assistant", layout="wide")
BACKEND_URL = "http://localhost:8000/"

# --- State Management Initialization ---
if "token" not in st.session_state:
    st.session_state.token = None
if "username" not in st.session_state:
    st.session_state.username = None
if "page" not in st.session_state:
    st.session_state.page = "Login"
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- Backend request helper ---
def backend_request(path: str, method: str = "get", json=None, data=None, files=None, headers=None, timeout: int = 8):
    """
    Safe wrapper around requests to call backend endpoints.
    - path: endpoint path relative to BACKEND_URL, e.g. 'auth/login' or '/profile/'
    - method: 'get' or 'post'
    """
    base = BACKEND_URL if BACKEND_URL.endswith('/') else BACKEND_URL + '/'
    url = urljoin(base, path.lstrip('/'))
    if method.lower() == "post":
        return requests.post(url, json=json, data=data, files=files, headers=headers, timeout=timeout)
    else:
        return requests.get(url, params=data, headers=headers, timeout=timeout)

# --- API Error Helper ---
def handle_api_error(e, context="request"):
    """Displays a user-friendly error message from the backend."""
    # If it's a requests HTTPError with response, try to show backend detail
    if isinstance(e, requests.exceptions.HTTPError):
        resp = getattr(e, "response", None)
        if resp is not None:
            try:
                detail = resp.json().get("detail") or resp.text
            except Exception:
                detail = resp.text
            st.error(f"Backend error during {context}: {detail}")
            return
    if isinstance(e, requests.exceptions.Timeout):
        st.error(f"Request timed out while {context}. Backend may be down or slow.")
    elif isinstance(e, (requests.exceptions.ConnectionError, requests.exceptions.RequestException)):
        st.error(f"Could not connect to backend while {context}. Check backend is running and BACKEND_URL is correct.")
    else:
        # fallback
        try:
            st.error(f"An unexpected error occurred while {context}: {e}")
        except Exception:
            st.error("An unexpected error occurred.")

# --- UI Pages ---
def render_login_page():
    st.header("Login / Signup")
    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        col1, col2 = st.columns(2)
        with col1:
            if st.form_submit_button("Login", use_container_width=True):
                try:
                    # FastAPI OAuth expects form-encoded data for /auth/login
                    r = backend_request("auth/login", method="post", data={'username': username, 'password': password}, timeout=8)
                    r.raise_for_status()
                    data = r.json()
                    st.session_state.token = data['access_token']
                    st.session_state.username = data['username']
                    st.session_state.page = "Chat"
                    st.rerun()
                except requests.exceptions.RequestException as e:
                    handle_api_error(e, "login")
        with col2:
            if st.form_submit_button("Sign Up", use_container_width=True):
                try:
                    r = backend_request("auth/signup", method="post", json={"username": username, "password": password}, timeout=8)
                    r.raise_for_status()
                    data = r.json()
                    st.session_state.token = data['access_token']
                    st.session_state.username = data['username']
                    st.session_state.page = "Chat"
                    st.rerun()
                except requests.exceptions.RequestException as e:
                    handle_api_error(e, "signup")

def render_chat_page():
    st.title(f"Welcome, {st.session_state.username}!")
    headers = {"Authorization": f"Bearer {st.session_state.token}"} if st.session_state.get("token") else {}

    # Display existing chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # --- UNIFIED INPUT FORM ---
    st.markdown("---")
    st.subheader("Compose Your Query")
    with st.form("query_form", clear_on_submit=True):
        st.write("You can record voice, type text, and upload an image. The AI will consider all inputs together.")

        recorded_audio_bytes = st_audiorec()
        text_input = st.text_area("Type additional symptoms or questions here:")
        uploaded_image = st.file_uploader("Optionally, upload an image of your concern:")

        submitted = st.form_submit_button("Submit Query")

        if submitted:
            if not recorded_audio_bytes and not text_input and not uploaded_image:
                st.warning("Please provide an input before submitting.")
                st.stop()

            try:
                # --- UNIFIED SUBMISSION LOGIC ---
                with st.spinner("Processing your multimodal query..."):
                    # Prepare data and files for the multipart request.
                    files_to_send = []
                    data_to_send = {'text_query': text_input}

                    if recorded_audio_bytes:
                        files_to_send.append(
                            ('audio_file', ('recorded_audio.wav', BytesIO(recorded_audio_bytes), 'audio/wav'))
                        )
                    if uploaded_image:
                        files_to_send.append(
                            ('image_file', (uploaded_image.name, uploaded_image.getvalue(), uploaded_image.type))
                        )

                    # Send all data to the new unified endpoint in a single request.
                    r = backend_request(
                        "query/multimodal",
                        method="post",
                        data=data_to_send,
                        files=files_to_send,
                        headers=headers,
                        timeout=20
                    )
                    r.raise_for_status()
                    response_data = r.json()

                    # Build a user-friendly summary of what was sent based on the response.
                    user_summary = []
                    if response_data.get("transcribed_text"):
                        user_summary.append(f"🎤 **You said:** *{response_data['transcribed_text']}*")
                    if text_input:
                        user_summary.append(f"📝 **You wrote:** *{text_input}*")
                    if response_data.get("image_caption"):
                        user_summary.append(f"🖼️ **Image analysis:** *{response_data['image_caption']}*")

                    # Display the results in the chat.
                    st.session_state.messages.append({"role": "user", "content": "\n\n".join(user_summary)})
                    st.session_state.messages.append({"role": "assistant", "content": response_data['text_response']})
                    st.rerun()

            except requests.exceptions.RequestException as e:
                handle_api_error(e, "query submission")
            except Exception as e:
                st.error(f"An unexpected client-side error occurred: {e}")

def render_dashboard_page():
    st.title("Your Health Dashboard")
    headers = {"Authorization": f"Bearer {st.session_state.token}"} if st.session_state.get("token") else {}

    # PDF Download button (streams the file and shows download)
    if st.button("Download PDF Report"):
        try:
            r = backend_request(f"report/user/{st.session_state.username}", method="get", headers=headers, timeout=30)
            r.raise_for_status()
            pdf_bytes = r.content
            st.download_button("Click to download report", data=pdf_bytes, file_name=f'health_report_{st.session_state.username}.pdf', mime='application/pdf')
        except requests.exceptions.RequestException as e:
            handle_api_error(e, "download report")

    try:
        r = backend_request("dashboard/history", method="get", headers=headers, timeout=8)
        r.raise_for_status()
        history = r.json()
        if not history:
            st.info("No conversation history yet.")
        for item in reversed(history):
            role = "You" if item['role'] == 'user' else "Assistant"
            content = item.get("content", "")
            timestamp_str = item.get("timestamp", "").split(".")[0].replace("T", " ")
            st.markdown(f"**{role}** (_{timestamp_str}_): {content}")
            st.markdown("---")
    except requests.exceptions.RequestException as e:
        handle_api_error(e, "dashboard")

# --- Profile Page ---
def render_profile_page():
    st.title("Personal Health Profile")
    username = st.session_state.get("username")
    if not username:
        st.info("Please login to edit your profile.")
        return

    headers = {"Authorization": f"Bearer {st.session_state.token}"} if st.session_state.get("token") else {}

    # try fetching existing profile (if any)
    existing = {}
    try:
        r = backend_request("profile/", method="get", headers=headers, timeout=6)
        if r.status_code == 200:
            existing = r.json() or {}
    except requests.exceptions.RequestException:
        existing = {}

    with st.form("profile_form"):
        age = st.number_input("Age", min_value=0, max_value=120, value=int(existing.get("age") or 25))
        gender_options = ['Prefer not to say', 'Female', 'Male', 'Other']
        gender_default_index = 0
        if existing.get("gender") in gender_options:
            gender_default_index = gender_options.index(existing.get("gender"))
        gender = st.selectbox("Gender", gender_options, index=gender_default_index)
        weight = st.number_input("Weight (kg)", min_value=0.0, max_value=300.0, value=float(existing.get("weight_kg") or 60.0))
        height = st.number_input("Height (cm)", min_value=0.0, max_value=250.0, value=float(existing.get("height_cm") or 160.0))
        allergies = st.text_area("Allergies (comma-separated)", value=existing.get("allergies") or "")
        goals = st.text_area("Health goals", value=existing.get("health_goals") or "")
        chronic = st.text_area("Chronic diseases", value=existing.get("chronic_diseases") or "")

        submitted = st.form_submit_button("Save Profile")
        if submitted:
            payload = {
                "age": int(age),
                "gender": gender,
                "weight_kg": float(weight),
                "height_cm": float(height),
                "allergies": allergies,
                "health_goals": goals,
                "chronic_diseases": chronic
            }
            try:
                r = backend_request("profile/", method="post", json=payload, headers=headers, timeout=8)
                r.raise_for_status()
                st.success("Profile saved.")
            except requests.exceptions.RequestException as e:
                handle_api_error(e, "saving profile")

# --- Main App Logic (updated sidebar with quick Profile & Report buttons) ---
st.sidebar.title("Navigation")

if st.session_state.get("token"):
    st.sidebar.write(f"Logged in as: **{st.session_state.username}**")

    # Primary navigation (keeps your original radio UI)
    page = st.sidebar.radio("Navigate", ["Chat", "Dashboard", "Profile", "Logout"])

    # Quick-action buttons placed below the radio navigation (keeps visual layout)
    st.sidebar.markdown("---")
    st.sidebar.markdown("### Quick Actions")
    # Profile quick button (navigates to Profile page)
    if st.sidebar.button("Open Profile"):
        st.session_state.page = "Profile"
        st.rerun()

    # Download PDF report quick button (downloads user's report)
    if st.sidebar.button("Download Report"):
        if not st.session_state.get("token") or not st.session_state.get("username"):
            st.sidebar.error("Please login to download your report.")
        else:
            headers = {"Authorization": f"Bearer {st.session_state.token}"}
            try:
                r = backend_request(f"report/user/{st.session_state.username}", method="get", headers=headers, timeout=30)
                r.raise_for_status()
                pdf_bytes = r.content
                st.sidebar.download_button("Click to download report", data=pdf_bytes, file_name=f'health_report_{st.session_state.username}.pdf', mime='application/pdf')
            except requests.exceptions.RequestException as e:
                handle_api_error(e, "download report")

    # Render the selected page (keeps your original logic)
    if page == "Chat":
        render_chat_page()
    elif page == "Dashboard":
        render_dashboard_page()
    elif page == "Profile":
        render_profile_page()
    elif page == "Logout":
        st.session_state.clear()
        st.session_state.page = "Login"
        st.rerun()
else:
    render_login_page()
