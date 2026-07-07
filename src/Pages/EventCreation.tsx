import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import { db, collection, addDoc, auth, storage } from "../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [organizerName, setOrganizerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  /* 
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [logoPreviews, setLogoPreviews] = useState<string[]>([]);
  */
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [enablePayment, setEnablePayment] = useState<boolean>(false);
  const [enableWhatsapp, setEnableWhatsapp] = useState<boolean>(false);
  const [upiQrFile, setUpiQrFile] = useState<File | null>(null);
  const [upiQrPreview, setUpiQrPreview] = useState<string | null>(null);

  const [eventData, setEventData] = useState({
    category: "",
    coordinator1: { name: "", phone: "" },
    coordinator2: { name: "", phone: "" },
    date: "",
    description: "",
    duration: "",
    event_date: "",
    event_time: "",
    name: "",
    num_of_participants: "",
    organiser: "",
    participants: [""],
    poster: null,
    logos: [],
    venue: "",
    paymentEnabled: false,
    price: "",
    whatsappLinkEnabled: false,
    whatsappLink: "",
    isTeamEvent: false,
    minTeamSize: "",
    maxTeamSize: "",
    isOvernight: false,
    isFoodProvided: false,
  });

  useEffect(() => {
    const fetchOrganizerName = async () => {
      const user = auth.currentUser;

      if (user) {
        // @ts-ignore
        const docRef = doc(db, "organizers", user.email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrganizerName(data.name || "Default Organizer Name");
        } else {
          setOrganizerName("Default Organizer Name");
        }
      } else {
        setOrganizerName("Guest");
      }
      setLoading(false);
    };

    fetchOrganizerName();
  }, [auth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEventData((prevData) => ({
          ...prevData,
          organiser: user.displayName || user.email || "Unknown Organizer",
        }));
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleCoordinatorChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const key = `coordinator${index + 1}`;
    setEventData({
      ...eventData,
      // @ts-ignore
      [key]: { ...eventData[key as keyof typeof eventData], [name]: value },
    });
  };

  const handlePosterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPosterPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };


/*
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      const newLogoFiles = [...logoFiles, selectedFile];
      setLogoFiles(newLogoFiles);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreviews(prevPreviews => [...prevPreviews, e.target?.result as string]);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeLogoAt = (index: number) => {
    const newLogoFiles = [...logoFiles];
    const newLogoPreviews = [...logoPreviews];
    
    newLogoFiles.splice(index, 1);
    newLogoPreviews.splice(index, 1);
    
    setLogoFiles(newLogoFiles);
    setLogoPreviews(newLogoPreviews);
  };
*/

  const handleUpiQrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setUpiQrFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setUpiQrPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    // @ts-ignore
    setEventData({ ...eventData, price: value });
  };

  const togglePaymentOption = () => {
    const newPaymentState = !enablePayment;
    setEnablePayment(newPaymentState);
    setEventData({
      ...eventData,
      paymentEnabled: newPaymentState,
      // @ts-ignore
      price: newPaymentState ? eventData.price : 0,
    });
  };

  const toggleWhatsappOption = () => {
    const newState = !enableWhatsapp;
    setEnableWhatsapp(newState);
    setEventData({
      ...eventData,
      whatsappLinkEnabled: newState,
      // @ts-ignore
      whatsappLink: newState ? eventData.whatsappLink : "",
    });
  };

  const toggleTeamEventOption = () => {
    setEventData({
      ...eventData,
      isTeamEvent: !eventData.isTeamEvent,
      minTeamSize: !eventData.isTeamEvent ? eventData.minTeamSize : "",
      maxTeamSize: !eventData.isTeamEvent ? eventData.maxTeamSize : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let posterURL = null;
      let logoURLs: string[] = [];
      
      if (file) {
        // @ts-ignore
        const posterRef = ref(storage, `eventPosters/${file.name}`);
        // @ts-ignore
        const posterSnapshot = await uploadBytes(posterRef, file);
        posterURL = await getDownloadURL(posterSnapshot.ref);
      }
      
      for (let i = 0; i < logoFiles.length; i++) {
        const logoFile = logoFiles[i];
        // @ts-ignore
        const logoRef = ref(storage, `eventLogos/${Date.now()}_${logoFile.name}`);
        // @ts-ignore
        const logoSnapshot = await uploadBytes(logoRef, logoFile);
        const logoURL = await getDownloadURL(logoSnapshot.ref);
        logoURLs.push(logoURL);
      }

      let upiQrURL = null;
      if (enablePayment && upiQrFile) {
        // @ts-ignore
        const qrRef = ref(storage, `upiQrCodes/${Date.now()}_${upiQrFile.name}`);
        // @ts-ignore
        const qrSnapshot = await uploadBytes(qrRef, upiQrFile);
        upiQrURL = await getDownloadURL(qrSnapshot.ref);
      }

      await addDoc(collection(db, "event"), {
        ...eventData,
        date: Timestamp.fromDate(
          new Date(eventData.event_date + "T" + eventData.event_time)
        ),
        poster: posterURL,
        logos: logoURLs,
        paymentEnabled: enablePayment,
        price: enablePayment ? eventData.price : 0,
        upiQr: upiQrURL,
        whatsappLinkEnabled: enableWhatsapp,
        whatsappLink: enableWhatsapp ? eventData.whatsappLink : "",
        isTeamEvent: eventData.isTeamEvent,
        minTeamSize: eventData.isTeamEvent ? parseInt(eventData.minTeamSize as string) || 0 : 0,
        maxTeamSize: eventData.isTeamEvent ? parseInt(eventData.maxTeamSize as string) || 0 : 0,
        isOvernight: eventData.isOvernight,
        isFoodProvided: eventData.isFoodProvided,
      });

      alert("Event created successfully!");
      navigate("/OrganiserHomePage/EventCreateSuccess");
    } catch (error) {
      console.error("Error adding event: ", error);
      alert("An error occurred while creating the event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e9f7f1] flex flex-col items-center p-4 pt-6 pb-20">
      <div className="w-full max-w-2xl mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      {/* Page Title */}
      <h2 className="text-2xl font-bold text-[#246d8c] mb-5 tracking-wide text-center">
        Create Event
      </h2>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Form Header */}
        <div className="bg-[#246d8c] p-6 text-white">
          <h3 className="text-xl font-bold">Event Details</h3>
          <p className="text-blue-100 text-sm mt-1">Fill in the details to publish a new event</p>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Event Media</h4>
            
            <div className="w-full h-48 mb-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden relative transition-colors hover:border-[#246d8c]">
              {posterPreview ? (
                <div className="relative w-full h-full group">
                  <img 
                    src={posterPreview} 
                    alt="Event poster preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label 
                      htmlFor="event-poster" 
                      className="bg-white text-[#246d8c] px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-100 shadow-md transition-transform transform hover:scale-105"
                    >
                      Change Poster
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="event-poster"
                  className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-gray-400 hover:text-[#246d8c]"
                >
                  <div className="text-4xl mb-2">+</div>
                  <div className="text-sm font-medium">Click to add event poster</div>
                  <div className="text-xs mt-1 opacity-70">Recommended size: 1080x1080</div>
                </label>
              )}
              <input
                id="event-poster"
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="hidden"
              />
            </div>
            
            {/* 
            <div className="w-full mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Organization Logos (Optional, up to 3)</div>
              
              {logoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {logoPreviews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 bg-white rounded-lg shadow-sm border border-gray-200 p-2 group">
                      <img src={preview} alt={`Logo ${index + 1}`} className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => removeLogoAt(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {logoFiles.length < 3 && (
                <div className="w-full h-16 bg-gray-50 border border-dashed border-gray-300 rounded-lg overflow-hidden relative hover:border-[#246d8c] transition-colors">
                  <label
                    htmlFor="event-logo"
                    className="flex items-center justify-center cursor-pointer w-full h-full text-gray-500 hover:text-[#246d8c]"
                  >
                    <span className="text-xl mr-2">+</span>
                    <span className="text-sm font-medium">Add logo for certificates</span>
                  </label>
                  <input
                    id="event-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            */}
          </div>

          <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Basic Information</h4>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Tech Symposium 2024"
                  value={eventData.name}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  placeholder="e.g. Workshop, Seminar"
                  value={eventData.category}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizer Name</label>
              <input
                type="text"
                name="organiser"
                value={loading ? "Loading..." : organizerName}
                className="w-full h-12 px-4 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input
                type="text"
                name="venue"
                placeholder="e.g. Main Auditorium"
                value={eventData.venue}
                onChange={handleInputChange}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                placeholder="Provide a detailed description of the event..."
                value={eventData.description}
                onChange={handleInputChange}
                className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                <input
                  type="date"
                  name="event_date"
                  value={eventData.event_date}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                <input
                  type="time"
                  name="event_time"
                  value={eventData.event_time}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  name="duration"
                  placeholder="e.g. 2 Hours, 1 Day"
                  value={eventData.duration}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                <input
                  type="number"
                  name="num_of_participants"
                  placeholder="Leave empty for unlimited"
                  value={eventData.num_of_participants}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4 pb-2 border-b border-gray-200">Team Event Details</h4>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-md font-medium text-gray-800">Team Event</div>
                  <div className="text-sm text-gray-500 mt-1">Allow participants to register as a team</div>
                </div>
                <button
                  type="button"
                  onClick={toggleTeamEventOption}
                  className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${
                    eventData.isTeamEvent ? 'bg-[#246D8C]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`${
                      eventData.isTeamEvent ? 'translate-x-6' : 'translate-x-1'
                    } inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`}
                  />
                </button>
              </div>

              {eventData.isTeamEvent && (
                <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Team Size</label>
                    <input
                      type="number"
                      name="minTeamSize"
                      placeholder="e.g. 2"
                      min="2"
                      value={eventData.minTeamSize}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none transition-all"
                      required={eventData.isTeamEvent}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
                    <input
                      type="number"
                      name="maxTeamSize"
                      placeholder="e.g. 4"
                      min={eventData.minTeamSize || "2"}
                      value={eventData.maxTeamSize}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none transition-all"
                      required={eventData.isTeamEvent}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Extra Event Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-6">
              <h3 className="text-xl font-bold text-[#246D8C] mb-6 border-b pb-2">Extra Settings</h3>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-800">Overnight Event</h4>
                  <p className="text-sm text-gray-500">Will this event span across multiple days/nights?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEventData({...eventData, isOvernight: !eventData.isOvernight})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventData.isOvernight ? 'bg-[#246D8C]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      eventData.isOvernight ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Food Provided</h4>
                  <p className="text-sm text-gray-500">Will food be provided to the participants?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEventData({...eventData, isFoodProvided: !eventData.isFoodProvided})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventData.isFoodProvided ? 'bg-[#246D8C]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      eventData.isFoodProvided ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4 pb-2 border-b border-gray-200">Coordinators</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <div className="text-md font-medium text-[#246d8c] mb-3">Coordinator 1</div>
                <div className="space-y-3">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={eventData.coordinator1.name}
                    onChange={(e) => handleCoordinatorChange(e, 0)}
                    className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none text-sm"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (10 digits)"
                    value={eventData.coordinator1.phone}
                    onChange={(e) => handleCoordinatorChange(e, 0)}
                    className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none text-sm"
                    pattern="[0-9]{10}"
                    title="Phone number must be exactly 10 digits"
                    maxLength={10}
                    minLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="text-md font-medium text-[#246d8c] mb-3">Coordinator 2 (Optional)</div>
                <div className="space-y-3">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={eventData.coordinator2.name}
                    onChange={(e) => handleCoordinatorChange(e, 1)}
                    className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none text-sm"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (10 digits)"
                    value={eventData.coordinator2.phone}
                    onChange={(e) => handleCoordinatorChange(e, 1)}
                    className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] outline-none text-sm"
                    pattern="[0-9]{10}"
                    title="Phone number must be exactly 10 digits"
                    maxLength={10}
                    minLength={10}
                  />
                </div>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4 pb-2 border-b border-gray-200">Registration & Payment</h4>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-md font-medium text-gray-800">Paid Event</div>
                  <div className="text-sm text-gray-500 mt-1">Require participants to pay a fee to register</div>
                </div>
                <button
                  type="button"
                  onClick={togglePaymentOption}
                  className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${
                    enablePayment ? 'bg-[#246D8C]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`${
                      enablePayment ? 'translate-x-6' : 'translate-x-1'
                    } inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`}
                  />
                </button>
              </div>

              {enablePayment && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload UPI QR Code
                    </label>
                    <div className="flex items-center gap-4">
                      {upiQrPreview && (
                        <div className="w-24 h-24 border rounded-md overflow-hidden bg-gray-50 flex-shrink-0">
                          <img src={upiQrPreview} alt="UPI QR Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpiQrChange}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#e9f7f1] file:text-[#246d8c] hover:file:bg-green-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload the QR code image for users to scan and pay.</p>
                      </div>
                    </div>
                  </div>

                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Event Registration Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={eventData.price}
                      onChange={handlePriceChange}
                      className="w-full h-12 pl-8 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all font-medium"
                      required={enablePayment}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mt-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-md font-medium text-gray-800">WhatsApp Group</div>
                  <div className="text-sm text-gray-500 mt-1">Provide a WhatsApp group link for participants to join after registering</div>
                </div>
                <button
                  type="button"
                  onClick={toggleWhatsappOption}
                  className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none ${
                    enableWhatsapp ? 'bg-[#246D8C]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`${
                      enableWhatsapp ? 'translate-x-6' : 'translate-x-1'
                    } inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`}
                  />
                </button>
              </div>

              {enableWhatsapp && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <label htmlFor="whatsappLink" className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Group Link
                  </label>
                  <input
                    type="url"
                    id="whatsappLink"
                    name="whatsappLink"
                    placeholder="https://chat.whatsapp.com/..."
                    value={eventData.whatsappLink}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#246d8c] focus:border-transparent outline-none transition-all font-medium"
                    required={enableWhatsapp}
                  />
                </div>
              )}
            </div>

            <div className="pt-6 mt-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#246d8c] hover:bg-[#1a4f63] hover:shadow-xl transform hover:-translate-y-1'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : "Publish Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;