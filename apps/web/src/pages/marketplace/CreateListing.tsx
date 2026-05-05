import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Camera,
  DollarSign,
  Calendar,
  Package,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import ImageUpload from "@/components/listing/ImageUpload";
import LocationPicker from "@/components/listing/LocationPicker";
import ConditionSelector from "@/components/listing/ConditionSelector";
import { useAuth } from "@/contexts/AuthContext";
import {
  createListingWithImages,
  fetchEditableListing,
  predictListingCategory,
  searchTaxonomy,
  updateUserListing,
  type PredictedCategorySuggestion,
} from "@/api/endpoints/listing";
import type { CreateListingPayload } from '@rentverse/shared';

interface SpecRow {
  key: string;
  value: string;
}

const parsePositiveNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const calculateRentalRates = (
  dailyRate: number,
  weeklyDiscountPercent: number = 0,
  monthlyDiscountPercent: number = 0
): { daily: number; weekly: number; monthly: number } => {
  const weekly = dailyRate * 7 * (1 - weeklyDiscountPercent / 100);
  const monthly = dailyRate * 30 * (1 - monthlyDiscountPercent / 100);
  return {
    daily: dailyRate,
    weekly: Math.round(weekly),
    monthly: Math.round(monthly),
  };
};

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userData } = useAuth();
  const editListingId = searchParams.get("edit") || "";
  const isEditMode = editListingId.length > 0;

  const [step, setStep] = useState(1);
  const [listingType, setListingType] = useState<"buy" | "rent" | "both">("both");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPublishTriggered, setIsPublishTriggered] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isPredictingCategory, setIsPredictingCategory] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<PredictedCategorySuggestion[]>([]);
  const [showAiSuggestionList, setShowAiSuggestionList] = useState(false);
  const [showManualCategorySearch, setShowManualCategorySearch] = useState(false);
  const [manualCategoryQuery, setManualCategoryQuery] = useState("");
  const [manualCategoryResults, setManualCategoryResults] = useState<
    Array<{ node_key: string; full_path: string; is_leaf: boolean }>
  >([]);

  const [specRows, setSpecRows] = useState<SpecRow[]>([{ key: "", value: "" }]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    categoryNodeKey: "",
    categoryPath: "",
    categorySource: "manual" as "ai" | "manual",
    categoryConfidence: null as number | null,
    condition: "good",
    conditionIssues: [] as string[],
    conditionNote: "",
    location: {
      address: "",
      city: "",
      state: "",
      country: "Pakistan",
      lat: 0,
      lng: 0,
      radius: 5,
    },
    price: {
      buy: "",
      rent: {
        daily: "",
        discountPercentageWeekly: 0,
        discountPercentageMonthly: 0,
      },
      securityDeposit: "",
    },
    features: [""],
    images: [] as File[],
    availability: {
      minRentalDays: 1,
      maxRentalDays: 30,
      securityDeposit: 0,
      totalForRent: 1,
      availableForRent: 1,
      totalForSale: 1,
      availableForSale: 1,
    },
  });

  const steps = [
    { number: 1, title: "What are you listing?" },
    { number: 2, title: "Add Details & Photos" },
    { number: 3, title: "Set Price & Availability" },
    { number: 4, title: "Review & Publish" },
  ];

  useEffect(() => {
    const loadEditableListing = async () => {
      if (!isEditMode || !currentUser) {
        return;
      }

      setIsEditLoading(true);
      setSubmitError(null);

      try {
        const editable = await fetchEditableListing(editListingId, currentUser.id);

        setListingType(editable.listingType);

        // Convert old weekly/monthly rates to new discount percentage format
        const daily = parsePositiveNumber(editable.price.rent.daily);
        const weekly = parsePositiveNumber(editable.price.rent.weekly);
        const monthly = parsePositiveNumber(editable.price.rent.monthly);
        
        let discountPercentageWeekly = 0;
        let discountPercentageMonthly = 0;
        
        if (daily > 0) {
          if (weekly > 0) {
            // Calculate discount percentage from weekly rate
            const expectedWeekly = daily * 7;
            discountPercentageWeekly = Math.round(((expectedWeekly - weekly) / expectedWeekly) * 100);
          }
          if (monthly > 0) {
            // Calculate discount percentage from monthly rate
            const expectedMonthly = daily * 30;
            discountPercentageMonthly = Math.round(((expectedMonthly - monthly) / expectedMonthly) * 100);
          }
        }

        setFormData({
          title: editable.title,
          description: editable.description,
          category: editable.category,
          subCategory: editable.subCategory,
          categoryNodeKey: editable.categoryNodeKey,
          categoryPath: editable.categoryPath,
          categorySource: editable.categorySource === "ai" ? "ai" : "manual",
          categoryConfidence: editable.categoryConfidence,
          condition: editable.condition,
          conditionIssues: (editable.specifications.__condition_issues || "")
            .split("\n")
            .map((issue) => issue.trim())
            .filter((issue) => issue.length > 0),
          conditionNote: editable.specifications.__condition_note || "",
          location: {
            ...editable.location,
            country: editable.location.country || "Pakistan",
          },
          price: {
            buy: editable.price.buy,
            rent: {
              daily: editable.price.rent.daily,
              discountPercentageWeekly,
              discountPercentageMonthly,
            },
            securityDeposit: editable.price.securityDeposit,
          },
          features: editable.features.length > 0 ? editable.features : [""],
          images: [],
          availability: {
            ...editable.availability,
            securityDeposit: parsePositiveNumber(editable.price.securityDeposit),
          },
        });

        setSpecRows(
          Object.entries(editable.specifications)
            .filter(([key]) => !key.startsWith("__"))
            .length > 0
            ? Object.entries(editable.specifications)
                .filter(([key]) => !key.startsWith("__"))
                .map(([key, value]) => ({ key, value }))
            : [{ key: "", value: "" }]
        );
        setExistingImageUrls(editable.images);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load listing for editing.";
        setSubmitError(message);
      } finally {
        setIsEditLoading(false);
      }
    };

    void loadEditableListing();
  }, [currentUser, editListingId, isEditMode]);

  useEffect(() => {
    if (formData.title.trim().length < 3 || formData.description.trim().length < 3) {
      return;
    }

    if (showManualCategorySearch) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsPredictingCategory(true);
        const predictions = await predictListingCategory(formData.title, formData.description, 4);
        setAiSuggestions(predictions);

        if (predictions.length > 0) {
          const top = predictions[0];
          const segments = top.fullPath.split(">").map((part) => part.trim());
          setFormData((prev) => ({
            ...prev,
            categoryNodeKey: top.nodeKey,
            categoryPath: top.fullPath,
            category: segments[0] || prev.category,
            subCategory: segments[1] || "",
            categorySource: "ai",
            categoryConfidence: top.confidence,
          }));
        }
      } catch {
        setAiSuggestions([]);
      } finally {
        setIsPredictingCategory(false);
      }
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData.title, formData.description, showManualCategorySearch]);

  useEffect(() => {
    if (!showManualCategorySearch) {
      return;
    }

    const query = manualCategoryQuery.trim();
    if (query.length < 2) {
      const timeoutId = window.setTimeout(() => {
        setManualCategoryResults([]);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchTaxonomy(query, 20);
        setManualCategoryResults(results);
      } catch {
        setManualCategoryResults([]);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [manualCategoryQuery, showManualCategorySearch]);

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



  const reviewRentalRates = (() => {
    const dailyRate = parsePositiveNumber(formData.price.rent.daily);

    if (dailyRate <= 0) {
      return null;
    }

    return calculateRentalRates(
      dailyRate,
      formData.price.rent.discountPercentageWeekly,
      formData.price.rent.discountPercentageMonthly
    );
  })();

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 1) {
      // No validation needed for step 1 - it's just selecting listing type
      return null;
    }

    if (currentStep === 2) {
      // Validate details & photos
      if (!formData.title.trim()) {
        return "Please add a title.";
      }
      if (formData.title.trim().length < 3) {
        return "Title must be at least 3 characters.";
      }
      if (!formData.description.trim()) {
        return "Please add a description.";
      }
      if (formData.description.trim().length < 3) {
        return "Description must be at least 3 characters.";
      }
      if (!formData.categoryNodeKey.trim()) {
        return "Please select a category.";
      }
      if (!formData.location.address.trim()) {
        return "Please add your item address.";
      }
      if (!formData.location.city.trim()) {
        return "Please select a city.";
      }
      const hasExistingImages = existingImageUrls.length > 0;
      if (!formData.images.length && !(isEditMode && hasExistingImages)) {
        return "Please upload at least one image.";
      }
      return null;
    }

    if (currentStep === 3) {
      // Validate price & availability
      const buyPrice = parsePositiveNumber(formData.price.buy);
      const dailyRent = parsePositiveNumber(formData.price.rent.daily);

      if ((listingType === "buy" || listingType === "both") && buyPrice <= 0) {
        return "Please set a valid selling price.";
      }

      if ((listingType === "buy" || listingType === "both") && formData.availability.totalForSale <= 0) {
        return "Please set total items available for sale.";
      }

      if (listingType === "rent" || listingType === "both") {
        if (dailyRent <= 0) {
          return "Please enter a daily rental rate.";
        }
        if (formData.availability.totalForRent <= 0) {
          return "Please set total items available for rent.";
        }
        if (formData.availability.maxRentalDays < formData.availability.minRentalDays) {
          return "Maximum rental days must be greater than or equal to minimum rental days.";
        }
      }

      return null;
    }

    return null;
  };

  const validateListing = (): string | null => {
    if (!currentUser) {
      return "You must be logged in to create a listing.";
    }
    // Run all step validations
    for (let i = 2; i <= 3; i++) {
      const error = validateStep(i);
      if (error) {
        return error;
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



      const conditionIssues = formData.conditionIssues
        .map((issue) => issue.trim())
        .filter((issue) => issue.length > 0);

      if (conditionIssues.length > 0) {
        specifications.__condition_issues = conditionIssues.join("\n");
      }

      if (formData.conditionNote.trim()) {
        specifications.__condition_note = formData.conditionNote.trim();
      }

      const features = formData.features
        .map((feature) => feature.trim())
        .filter((feature) => feature.length > 0);

      const securityDeposit = parsePositiveNumber(formData.price.securityDeposit);

      // Calculate rental rates from daily + discount percentages
      const dailyRate = parsePositiveNumber(formData.price.rent.daily);
      const rentalRates = dailyRate > 0 
        ? calculateRentalRates(
            dailyRate,
            formData.price.rent.discountPercentageWeekly,
            formData.price.rent.discountPercentageMonthly
          )
        : { daily: 0, weekly: 0, monthly: 0 };

      const payload: CreateListingPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        categoryNodeKey: formData.categoryNodeKey,
        categoryPath: formData.categoryPath,
        categorySource: formData.categorySource,
        categoryConfidence: formData.categoryConfidence,
        condition: formData.condition,
        listingType,
        location: {
          ...formData.location,
          radius: formData.location.radius || 5,
        },
        price: {
          buy: formData.price.buy.trim(),
          rent: {
            daily: rentalRates.daily.toString(),
            weekly: rentalRates.weekly.toString(),
            monthly: rentalRates.monthly.toString(),
          },
          securityDeposit: formData.price.securityDeposit.trim(),
        },
        specifications,
        features,
        availability: {
          ...formData.availability,
          securityDeposit,
          availableForRent: formData.availability.totalForRent,
          availableForSale: formData.availability.totalForSale,
        },
        images: formData.images,
      };

      console.log('Publishing listing:', {
        title: payload.title,
        categoryNodeKey: payload.categoryNodeKey,
        categoryPath: payload.categoryPath,
        categorySource: payload.categorySource,
        listingType,
        imageCount: payload.images.length,
      });

      if (isEditMode) {
        await updateUserListing(
          {
            listingId: editListingId,
            ...payload,
            images: payload.images.length > 0 ? payload.images : undefined,
          },
          currentUser.id
        );
      } else {
        await createListingWithImages(payload, {
          userId: currentUser.id,
          email: currentUser.email || userData?.email || "",
          name:
            (currentUser.user_metadata?.full_name as string | undefined) ||
            userData?.name ||
            "Unknown user",
        });
      }

      navigate("/my-listings");
    } catch (error) {
      const message =
        error instanceof TypeError && /fetch/i.test(error.message)
          ? "Could not connect to the server. Please check your internet connection and try again."
          : error instanceof Error
          ? error.message
          : "Failed to publish listing.";
      setSubmitError(message);
    } finally {
      setIsPublishTriggered(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-6xl">
        {isEditLoading ? (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 text-gray-600">
            Loading listing details for edit...
          </div>
        ) : null}
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
                    <h2 className="text-2xl font-bold">
                      {isEditMode ? "Update Photos & Details" : "Add Photos & Details"}
                    </h2>
                  </div>

                  <ImageUpload
                    maxImages={5}
                    onImagesChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                  />

                  {isEditMode && existingImageUrls.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      Current listing has {existingImageUrls.length} image(s). Upload new images only if you want to replace them.
                    </div>
                  ) : null}

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

                  <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-blue-900">Category (AI Assisted)</h3>
                        {isPredictingCategory ? (
                          <span className="text-sm text-blue-700">Analyzing title and description...</span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAiSuggestionList((prev) => !prev);
                          setShowManualCategorySearch(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-300 bg-white px-3 py-2 text-left text-sm text-blue-900"
                      >
                        <span className="pr-3 leading-5 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                          {formData.categoryPath || "No category selected yet."}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            showAiSuggestionList ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showAiSuggestionList ? (
                        <div className="max-h-96 overflow-auto rounded-lg border border-blue-200 bg-white">
                          {aiSuggestions.length > 0 ? (
                            aiSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.nodeKey}
                                type="button"
                                onClick={() => {
                                  const segments = suggestion.fullPath
                                    .split(">")
                                    .map((part) => part.trim());
                                  setFormData((prev) => ({
                                    ...prev,
                                    categoryNodeKey: suggestion.nodeKey,
                                    categoryPath: suggestion.fullPath,
                                    category: segments[0] || prev.category,
                                    subCategory: segments[1] || "",
                                    categorySource: "ai",
                                    categoryConfidence: suggestion.confidence,
                                  }));
                                  setShowAiSuggestionList(false);
                                  setShowManualCategorySearch(false);
                                }}
                                className={`block w-full border-b border-blue-100 px-3 py-2 text-left text-sm leading-6 last:border-b-0 ${
                                  formData.categoryNodeKey === suggestion.nodeKey
                                    ? "bg-blue-100 text-blue-900"
                                    : "text-gray-700 hover:bg-blue-50"
                                }`}
                              >
                                {suggestion.fullPath}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-gray-500">No AI suggestions yet.</p>
                          )}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setShowManualCategorySearch((prev) => !prev);
                          setShowAiSuggestionList(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <span>{showManualCategorySearch ? "Hide Manual Search" : "Manual Change"}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            showManualCategorySearch ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showManualCategorySearch ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={manualCategoryQuery}
                            onChange={(event) => setManualCategoryQuery(event.target.value)}
                            placeholder="Search taxonomy category"
                            className="input-field"
                          />
                          <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white">
                            {manualCategoryResults.map((item) => (
                              <button
                                key={item.node_key}
                                type="button"
                                disabled={!item.is_leaf}
                                onClick={() => {
                                  const segments = item.full_path.split(">").map((part) => part.trim());
                                  setFormData((prev) => ({
                                    ...prev,
                                    categoryNodeKey: item.node_key,
                                    categoryPath: item.full_path,
                                    category: segments[0] || prev.category,
                                    subCategory: segments[1] || "",
                                    categorySource: "manual",
                                    categoryConfidence: null,
                                  }));
                                  setShowManualCategorySearch(false);
                                }}
                                className={`block w-full border-b border-gray-100 px-3 py-2 text-left text-sm leading-6 last:border-b-0 ${
                                  item.is_leaf
                                    ? "text-gray-700 hover:bg-gray-50"
                                    : "cursor-not-allowed text-gray-400"
                                }`}
                              >
                                {item.full_path}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6">
                    <ConditionSelector
                      value={formData.condition}
                      initialIssues={formData.conditionIssues}
                      initialNote={formData.conditionNote}
                      onConditionChange={(condition: string, issues: string[], note: string) =>
                        setFormData((prev) => ({
                          ...prev,
                          condition,
                          conditionIssues: issues,
                          conditionNote: note,
                        }))
                      }
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
                        <div key={`spec-row-${index}`} className="grid grid-cols-12 gap-2">
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
                        <div key={`feature-row-${index}`} className="grid grid-cols-12 gap-2">
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
                      <label className="mb-2 block text-sm font-medium text-gray-700">Sell Price (PKR)</label>
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

                      <label className="mb-2 mt-4 block text-sm font-medium text-gray-700">
                        Total Items Available for Sale
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.availability.totalForSale}
                        onChange={(e) => {
                          const total = Math.max(1, Number.parseInt(e.target.value || "1", 10));
                          setFormData((prev) => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              totalForSale: total,
                              availableForSale: total,
                            },
                          }));
                        }}
                        className="input-field"
                      />
                    </div>
                  )}

                  {(listingType === "rent" || listingType === "both") && (
                    <>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Rental Rates</h3>
                        <p className="text-sm text-blue-800 mb-4">
                          Set your daily rate and optional discounts for weekly and monthly rentals.
                        </p>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Daily Rate (PKR) <span className="text-red-500">*</span>
                            </label>
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
                              className="input-field font-semibold"
                            />
                            <p className="mt-2 text-xs text-gray-500">Base rate for 1 day</p>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Weekly Discount (%) <span className="text-gray-400">Optional</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.price.rent.discountPercentageWeekly}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(100, Number.parseInt(e.target.value || "0", 10)));
                                setFormData((prev) => ({
                                  ...prev,
                                  price: {
                                    ...prev.price,
                                    rent: { ...prev.price.rent, discountPercentageWeekly: value },
                                  },
                                }));
                              }}
                              placeholder="e.g. 10"
                              className="input-field"
                            />
                            <div className="mt-2">
                              {(() => {
                                const daily = parsePositiveNumber(formData.price.rent.daily);
                                if (daily <= 0) {
                                  return <p className="text-xs text-gray-500">Enter daily rate first</p>;
                                }
                                const rates = calculateRentalRates(daily, formData.price.rent.discountPercentageWeekly, 0);
                                return (
                                  <p className="text-sm font-semibold text-blue-700">
                                    7 days: PKR {rates.weekly.toLocaleString()}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Monthly Discount (%) <span className="text-gray-400">Optional</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.price.rent.discountPercentageMonthly}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(100, Number.parseInt(e.target.value || "0", 10)));
                                setFormData((prev) => ({
                                  ...prev,
                                  price: {
                                    ...prev.price,
                                    rent: { ...prev.price.rent, discountPercentageMonthly: value },
                                  },
                                }));
                              }}
                              placeholder="e.g. 20"
                              className="input-field"
                            />
                            <div className="mt-2">
                              {(() => {
                                const daily = parsePositiveNumber(formData.price.rent.daily);
                                if (daily <= 0) {
                                  return <p className="text-xs text-gray-500">Enter daily rate first</p>;
                                }
                                const rates = calculateRentalRates(daily, 0, formData.price.rent.discountPercentageMonthly);
                                return (
                                  <p className="text-sm font-semibold text-blue-700">
                                    30 days: PKR {rates.monthly.toLocaleString()}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Security Deposit (PKR)
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

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Total Items Available for Rent
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.availability.totalForRent}
                          onChange={(e) => {
                            const total = Math.max(1, Number.parseInt(e.target.value || "1", 10));
                            setFormData((prev) => ({
                              ...prev,
                              availability: {
                                ...prev.availability,
                                totalForRent: total,
                                availableForRent: total,
                              },
                            }));
                          }}
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
                    </>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="card p-8">
                  <h2 className="mb-6 text-2xl font-bold">Review Your Listing</h2>

                  <div className="space-y-6">
                    {/* Main Preview */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid gap-6 md:grid-cols-3">
                        {/* Images */}
                        <div className="md:col-span-1">
                          {formData.images[0] ? (
                            <img
                              src={URL.createObjectURL(formData.images[0])}
                              alt="Preview"
                              className="h-64 w-full object-cover"
                            />
                          ) : existingImageUrls[0] ? (
                            <img
                              src={existingImageUrls[0]}
                              alt="Current"
                              className="h-64 w-full object-cover"
                            />
                          ) : (
                            <div className="h-64 w-full bg-gray-100 flex items-center justify-center text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                        {/* Summary */}
                        <div className="md:col-span-2 p-6">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{formData.title}</h3>
                          <p className="text-gray-600 text-sm mb-4">{formData.category} {formData.subCategory && `> ${formData.subCategory}`}</p>
                          <p className="text-gray-700 mb-6 leading-relaxed">{formData.description}</p>
                          
                          <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200">
                            {(listingType === "buy" || listingType === "both") && formData.price.buy ? (
                              <div>
                                <p className="text-sm text-gray-500">Selling Price</p>
                                <p className="text-lg font-bold text-green-600">PKR {parsePositiveNumber(formData.price.buy).toLocaleString()}</p>
                              </div>
                            ) : null}
                            {(listingType === "rent" || listingType === "both") && formData.price.rent.daily ? (
                              <div>
                                <p className="text-sm text-gray-500">Daily Rental</p>
                                <p className="text-lg font-bold text-blue-600">PKR {parsePositiveNumber(formData.price.rent.daily).toLocaleString()}/day</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Item Details */}
                      <div className="rounded-xl border border-gray-200 p-6">
                        <h4 className="font-semibold text-lg mb-4 text-gray-900">Item Details</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500">Condition</p>
                            <p className="font-medium text-gray-900 capitalize">{formData.condition}</p>
                          </div>
                          {formData.conditionNote && (
                            <div>
                              <p className="text-sm text-gray-500">Condition Notes</p>
                              <p className="text-gray-700">{formData.conditionNote}</p>
                            </div>
                          )}
                          {formData.features && formData.features.filter(f => f.trim()).length > 0 && (
                            <div>
                              <p className="text-sm text-gray-500 mb-2">Features & Accessories</p>
                              <div className="flex flex-wrap gap-2">
                                {formData.features.filter(f => f.trim()).map((feature, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing Details */}
                      <div className="rounded-xl border border-gray-200 p-6">
                        <h4 className="font-semibold text-lg mb-4 text-gray-900">Pricing</h4>
                        <div className="space-y-3">
                          {(listingType === "buy" || listingType === "both") && formData.price.buy && (
                            <div className="flex justify-between py-2 border-b border-gray-100">
                              <span className="text-gray-600">Selling Price</span>
                              <span className="font-semibold text-gray-900">PKR {parsePositiveNumber(formData.price.buy).toLocaleString()}</span>
                            </div>
                          )}
                          {(listingType === "rent" || listingType === "both") && (
                            <>
                              {formData.price.rent.daily && (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Daily Rental</span>
                                  <span className="font-semibold text-gray-900">PKR {parsePositiveNumber(formData.price.rent.daily).toLocaleString()}</span>
                                </div>
                              )}
                              {reviewRentalRates ? (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Weekly Rental ({formData.price.rent.discountPercentageWeekly}% off)</span>
                                  <span className="font-semibold text-gray-900">PKR {reviewRentalRates.weekly.toLocaleString()}</span>
                                </div>
                              ) : null}
                              {reviewRentalRates ? (
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Monthly Rental ({formData.price.rent.discountPercentageMonthly}% off)</span>
                                  <span className="font-semibold text-gray-900">PKR {reviewRentalRates.monthly.toLocaleString()}</span>
                                </div>
                              ) : null}
                              {formData.price.securityDeposit && (
                                <div className="flex justify-between py-2">
                                  <span className="text-gray-600">Security Deposit</span>
                                  <span className="font-semibold text-gray-900">PKR {parsePositiveNumber(formData.price.securityDeposit).toLocaleString()}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location Details */}
                    <div className="rounded-xl border border-gray-200 p-6">
                      <h4 className="font-semibold text-lg mb-4 text-gray-900">Location</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium text-gray-900">{formData.location.address || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">City</p>
                          <p className="font-medium text-gray-900">{formData.location.city || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">State / Province</p>
                          <p className="font-medium text-gray-900">{formData.location.state || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Country</p>
                          <p className="font-medium text-gray-900">{formData.location.country || 'Not specified'}</p>
                        </div>
                        {(listingType === "rent" || listingType === "both") && (
                          <div>
                            <p className="text-sm text-gray-500">Service Radius</p>
                            <p className="font-medium text-gray-900">{formData.location.radius} km</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Availability Details */}
                    {(listingType === "rent" || listingType === "both") && (
                      <div className="rounded-xl border border-gray-200 p-6">
                        <h4 className="font-semibold text-lg mb-4 text-gray-900">Rental Availability</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm text-gray-500">Minimum Rental Duration</p>
                            <p className="font-medium text-gray-900">{formData.availability.minRentalDays} day(s)</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Maximum Rental Duration</p>
                            <p className="font-medium text-gray-900">{formData.availability.maxRentalDays} day(s)</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Available Units</p>
                            <p className="font-medium text-gray-900">{formData.availability.availableForRent} / {formData.availability.totalForRent}</p>
                          </div>
                        </div>
                      </div>
                    )}



                    {/* Important Reminders */}
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                        <div>
                          <h4 className="mb-3 font-semibold text-yellow-800">Important Reminders</h4>
                          <ul className="space-y-2 text-sm text-yellow-700">
                            <li>• Be honest about condition and specifications.</li>
                            <li>• Ensure rent/sell rates are market realistic.</li>
                            <li>• Respond quickly to increase booking chances.</li>
                            <li>• High-quality images and detailed descriptions improve visibility.</li>
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
                    onClick={() => {
                      const stepError = validateStep(step);
                      if (stepError) {
                        setSubmitError(stepError);
                      } else {
                        setSubmitError(null);
                        setStep(step + 1);
                      }
                    }}
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
                    {isSubmitting
                      ? isEditMode
                        ? "Saving..."
                        : "Publishing..."
                      : isEditMode
                      ? "Save Changes"
                      : "Publish Listing"}
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

