import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  DollarSign,
  Calendar,
  Package,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import ImageUpload from "@/components/listing/ImageUpload";
import CategorySelector from "@/components/listing/CategorySelector";
import LocationPicker from "@/components/listing/LocationPicker";
import ConditionSelector from "@/components/listing/ConditionSelector";
import AIRecommendations from "@/components/listing/AIRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { createListingWithImages } from "@/api/endpoints/listing";
import type { CreateListingPayload } from "@/types/listing.types";

interface SpecRow {
  key: string;
  value: string;
}

const parsePositiveNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const [step, setStep] = useState(1);
  const [listingType, setListingType] = useState<"buy" | "rent" | "both">("both");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPublishTriggered, setIsPublishTriggered] = useState(false);

  const [specRows, setSpecRows] = useState<SpecRow[]>([{ key: "", value: "" }]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    condition: "good",
    location: {
      address: "",
      city: "",
      state: "",
      country: "",
      lat: 0,
      lng: 0,
      radius: 5,
    },
    price: {
      buy: "",
      rent: {
        daily: "",
        weekly: "",
        monthly: "",
      },
      securityDeposit: "",
    },
    features: [""],
    images: [] as File[],
    availability: {
      minRentalDays: 1,
      maxRentalDays: 30,
      instantBooking: true,
      maxRenters: 1,
      securityDeposit: 0,
    },
  });

  const steps = [
    { number: 1, title: "What are you listing?" },
    { number: 2, title: "Add Details & Photos" },
    { number: 3, title: "Set Price & Availability" },
    { number: 4, title: "Review & Publish" },
  ];

  const updateFeature = (index: number, value: string) => {
    setFormData((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const addFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => {
      const features = prev.features.filter((_, i) => i !== index);
      return { ...prev, features: features.length ? features : [""] };
    });
  };

  const updateSpecRow = (index: number, field: keyof SpecRow, value: string) => {
    setSpecRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addSpecRow = () => {
    setSpecRows((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeSpecRow = (index: number) => {
    setSpecRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ key: "", value: "" }];
    });
  };

  const validateListing = (): string | null => {
    if (!currentUser) {
      return "You must be logged in to create a listing.";
    }
    if (!formData.title.trim()) {
      return "Please add a title.";
    }
    if (!formData.description.trim()) {
      return "Please add a description.";
    }
    if (!formData.category.trim()) {
      return "Please select a category.";
    }
    if (!formData.location.address.trim()) {
      return "Please add your item address.";
    }
    if (!formData.location.city.trim() || !formData.location.country.trim()) {
      return "Please provide complete location details (city and country).";
    }
    if (!formData.images.length) {
      return "Please upload at least one image.";
    }

    const buyPrice = parsePositiveNumber(formData.price.buy);
    const dailyRent = parsePositiveNumber(formData.price.rent.daily);
    const weeklyRent = parsePositiveNumber(formData.price.rent.weekly);
    const monthlyRent = parsePositiveNumber(formData.price.rent.monthly);

    if ((listingType === "buy" || listingType === "both") && buyPrice <= 0) {
      return "Please set a valid selling price.";
    }

    if (listingType === "rent" || listingType === "both") {
      if (dailyRent <= 0 || weeklyRent <= 0 || monthlyRent <= 0) {
        return "Please enter daily, weekly, and monthly rental prices.";
      }
      if (formData.availability.maxRentalDays < formData.availability.minRentalDays) {
        return "Maximum rental days must be greater than or equal to minimum rental days.";
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against implicit/accidental form submits.
    if (!isPublishTriggered) {
      return;
    }

    setSubmitError(null);
    const validationError = validateListing();
    if (validationError) {
      setIsPublishTriggered(false);
      setSubmitError(validationError);
      return;
    }

    if (!currentUser) {
      setIsPublishTriggered(false);
      setSubmitError("You must be logged in to create a listing.");
      return;
    }

    setIsSubmitting(true);

    try {
      const specifications = specRows.reduce<Record<string, string>>((acc, row) => {
        const key = row.key.trim();
        const value = row.value.trim();
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const features = formData.features
        .map((feature) => feature.trim())
        .filter((feature) => feature.length > 0);

      const securityDeposit = parsePositiveNumber(formData.price.securityDeposit);

      const payload: CreateListingPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        condition: formData.condition,
        listingType,
        location: {
          ...formData.location,
          radius: formData.location.radius || 5,
        },
        price: {
          buy: formData.price.buy.trim(),
          rent: {
            daily: formData.price.rent.daily.trim(),
            weekly: formData.price.rent.weekly.trim(),
            monthly: formData.price.rent.monthly.trim(),
          },
          securityDeposit: formData.price.securityDeposit.trim(),
        },
        specifications,
        features,
        availability: {
          ...formData.availability,
          securityDeposit,
        },
        images: formData.images,
      };

      await createListingWithImages(payload, {
        firebaseUid: currentUser.uid,
        email: currentUser.email || userData?.email || "",
        name: currentUser.displayName || userData?.name || "Unknown user",
      });

      navigate("/my-listings");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish listing.";
      setSubmitError(message);
    } finally {
      setIsPublishTriggered(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-6xl">
        <div className="mb-8">
          <div className="mb-4 flex justify-between">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    step >= s.number
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > s.number ? "✓" : s.number}
                </div>
                <span className="mt-2 text-sm text-gray-600">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-4 h-2 rounded-full bg-gray-200">
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${(step - 1) * 33.33}%` }}
            />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {step === 1 && (
                <div className="card p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <Package className="text-primary-600" size={24} />
                    <h2 className="text-2xl font-bold">What do you want to do with this item?</h2>
                  </div>

                  <div className="mb-8 grid gap-6 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setListingType("rent")}
                      className={`rounded-xl border-2 p-6 text-center transition-all ${
                        listingType === "rent"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Calendar className="mx-auto mb-4 h-12 w-12 text-blue-500" />
                      <h3 className="mb-2 text-lg font-bold">Rent Only</h3>
                      <p className="text-sm text-gray-600">Earn money by renting your item.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setListingType("buy")}
                      className={`rounded-xl border-2 p-6 text-center transition-all ${
                        listingType === "buy"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <DollarSign className="mx-auto mb-4 h-12 w-12 text-green-500" />
                      <h3 className="mb-2 text-lg font-bold">Sell Only</h3>
                      <p className="text-sm text-gray-600">Sell your item for one-time payment.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setListingType("both")}
                      className={`rounded-xl border-2 p-6 text-center transition-all ${
                        listingType === "both"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Sparkles className="mx-auto mb-4 h-12 w-12 text-purple-500" />
                      <h3 className="mb-2 text-lg font-bold">Rent & Sell</h3>
                      <p className="text-sm text-gray-600">Capture both rental and resale demand.</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="card p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <Camera className="text-primary-600" size={24} />
                    <h2 className="text-2xl font-bold">Add Photos & Details</h2>
                  </div>

                  <ImageUpload
                    maxImages={5}
                    onImagesChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                  />

                  <div className="mt-8">
                    <label className="mb-3 block text-lg font-semibold">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Sony A7III Camera with Lens"
                      className="input-field text-lg"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-3 block text-lg font-semibold">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={6}
                      placeholder="Include condition, accessories, usage, and any defects."
                      className="input-field"
                    />
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <CategorySelector
                      selectedCategory={formData.category}
                      onCategoryChange={(categoryId, subcategory) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: categoryId,
                          subCategory: subcategory || "",
                        }))
                      }
                    />

                    <ConditionSelector
                      value={formData.condition}
                      onChange={(condition) => setFormData((prev) => ({ ...prev, condition }))}
                    />
                  </div>

                  <div className="mt-8">
                    <LocationPicker
                      value={formData.location}
                      onChange={(location) => setFormData((prev) => ({ ...prev, location }))}
                    />
                  </div>

                  <div className="mt-8 rounded-xl border border-gray-200 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Specifications</h3>
                      <button
                        type="button"
                        onClick={addSpecRow}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {specRows.map((row, index) => (
                        <div key={`${index}-${row.key}`} className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) => updateSpecRow(index, "key", e.target.value)}
                            placeholder="Spec name (e.g., Brand)"
                            className="input-field col-span-5"
                          />
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) => updateSpecRow(index, "value", e.target.value)}
                            placeholder="Spec value (e.g., Sony)"
                            className="input-field col-span-6"
                          />
                          <button
                            type="button"
                            onClick={() => removeSpecRow(index)}
                            className="col-span-1 inline-flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-gray-200 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Features</h3>
                      <button
                        type="button"
                        onClick={addFeature}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.features.map((feature, index) => (
                        <div key={`${index}-${feature}`} className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => updateFeature(index, e.target.value)}
                            placeholder="e.g., Original charger included"
                            className="input-field col-span-11"
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="col-span-1 inline-flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="card p-8 space-y-6">
                  <h2 className="text-2xl font-bold">Set Price & Availability</h2>

                  {(listingType === "buy" || listingType === "both") && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Sell Price (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.price.buy}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            price: { ...prev.price, buy: e.target.value },
                          }))
                        }
                        placeholder="Enter selling price"
                        className="input-field"
                      />
                    </div>
                  )}

                  {(listingType === "rent" || listingType === "both") && (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Daily Rate (INR)</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.price.rent.daily}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                price: {
                                  ...prev.price,
                                  rent: { ...prev.price.rent, daily: e.target.value },
                                },
                              }))
                            }
                            placeholder="e.g. 1200"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Weekly Rate (INR)</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.price.rent.weekly}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                price: {
                                  ...prev.price,
                                  rent: { ...prev.price.rent, weekly: e.target.value },
                                },
                              }))
                            }
                            placeholder="e.g. 6000"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Monthly Rate (INR)</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.price.rent.monthly}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                price: {
                                  ...prev.price,
                                  rent: { ...prev.price.rent, monthly: e.target.value },
                                },
                              }))
                            }
                            placeholder="e.g. 20000"
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Security Deposit (INR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.price.securityDeposit}
                          onChange={(e) => {
                            const value = e.target.value;
                            const deposit = parsePositiveNumber(value);
                            setFormData((prev) => ({
                              ...prev,
                              price: { ...prev.price, securityDeposit: value },
                              availability: { ...prev.availability, securityDeposit: deposit },
                            }));
                          }}
                          placeholder="Optional"
                          className="input-field"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Minimum Rental Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.availability.minRentalDays}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  minRentalDays: Math.max(1, Number.parseInt(e.target.value || "1", 10)),
                                },
                              }))
                            }
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Maximum Rental Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.availability.maxRentalDays}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  maxRentalDays: Math.max(1, Number.parseInt(e.target.value || "1", 10)),
                                },
                              }))
                            }
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Max Renters</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.availability.maxRenters}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  maxRenters: Math.max(1, Number.parseInt(e.target.value || "1", 10)),
                                },
                              }))
                            }
                            className="input-field"
                          />
                        </div>
                        <label className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.availability.instantBooking}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  instantBooking: e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Allow instant booking
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="card p-8">
                  <h2 className="mb-6 text-2xl font-bold">Review Your Listing</h2>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 p-6">
                      <h3 className="mb-4 text-lg font-semibold">Listing Preview</h3>
                      <div className="grid gap-6 md:grid-cols-2">
                        {formData.images[0] ? (
                          <img
                            src={URL.createObjectURL(formData.images[0])}
                            alt="Preview"
                            className="h-48 w-full rounded-lg object-cover"
                          />
                        ) : null}
                        <div>
                          <h4 className="text-xl font-bold">{formData.title}</h4>
                          <p className="mt-2 text-gray-600">{formData.description.slice(0, 140)}...</p>
                          <div className="mt-4 space-y-2">
                            {(listingType === "buy" || listingType === "both") && formData.price.buy ? (
                              <div className="text-lg font-bold text-green-600">Sell: ₹{formData.price.buy}</div>
                            ) : null}
                            {(listingType === "rent" || listingType === "both") && formData.price.rent.daily ? (
                              <div className="text-lg font-bold text-blue-600">
                                Rent: ₹{formData.price.rent.daily}/day
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <AIRecommendations
                      listingData={{
                        title: formData.title,
                        description: formData.description,
                        category: formData.category,
                        condition: formData.condition,
                        price: parsePositiveNumber(formData.price.buy),
                        location: formData.location.address,
                      }}
                      onApplyRecommendation={(type, value) => {
                        console.log("Applying recommendation:", type, value);
                      }}
                    />

                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-yellow-600" size={24} />
                        <div>
                          <h4 className="mb-2 font-semibold text-yellow-800">Important Reminders</h4>
                          <ul className="space-y-2 text-yellow-700">
                            <li>• Be honest about condition and specifications.</li>
                            <li>• Ensure rent/sell rates are market realistic.</li>
                            <li>• Respond quickly to increase booking chances.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {submitError ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                  {submitError}
                </div>
              ) : null}

              <div className="flex justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-8 py-3 hover:bg-gray-50"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={isSubmitting}
                    className="btn-primary px-8 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue to {steps[step].title}
                    <ChevronRight size={20} className="ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={() => setIsPublishTriggered(true)}
                    disabled={isSubmitting}
                    className="btn-primary px-12 py-3 text-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Publishing..." : "Publish Listing"}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="mb-4 text-lg font-semibold">Tips for Success</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary-500" />
                  <span>Use clear, well-lit photos from multiple angles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary-500" />
                  <span>Add complete specs and features for better trust.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary-500" />
                  <span>Set both rent and sell prices if listing type is both.</span>
                </li>
              </ul>
            </div>

            <div className="card border-blue-200 bg-blue-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-blue-800">Pricing Guide</h3>
              <div className="space-y-4 text-xs text-blue-700">
                <div>
                  Daily rate = item value x 0.5% to 2%
                  <br />
                  Weekly = daily x 5
                  <br />
                  Monthly = daily x 20
                </div>
                <div>
                  Security deposit is usually 20%-50% of item value.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
