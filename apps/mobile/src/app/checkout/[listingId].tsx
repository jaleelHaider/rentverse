import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MarketplacePaymentMethod } from '@rentverse/shared';
import { useListing } from '../../hooks/useListings';
import { useAuth } from '../../hooks/useAuth';
import { usePlaceOrderMutation } from '../../hooks/useOrders';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

const fmt = (value: number) => `PKR ${Number(value).toLocaleString()}`;

type OrderMode = 'buy' | 'rent';
type RentalUnit = 'day' | 'week' | 'month';

const CITY_STATE_MAPPING: Record<string, string[]> = {
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Shikarpur', 'Jacobabad', 'Dadu'],
  Punjab: ['Lahore', 'Faisalabad', 'Multan', 'Rawalpindi', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha'],
  KPK: ['Peshawar', 'Mardan', 'Abbottabad', 'Kohat', 'Bannu', 'Mingora', 'Dera Ismail Khan', 'Charsadda'],
  Balochistan: ['Quetta', 'Gwadar', 'Khuzdar', 'Turbat', 'Chaman', 'Sibi', 'Nasirabad', 'Loralai'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza', 'Nagar', 'Diamer', 'Ghanche'],
  'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bhimber', 'Poonch'],
  'Islamabad Capital Territory': ['Islamabad'],
};

const STATES = Object.keys(CITY_STATE_MAPPING);

export default function CheckoutScreen() {
  const { listingId, orderType } = useLocalSearchParams<{ listingId: string; orderType: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: listing, isLoading } = useListing(listingId as string);
  const placeMutation = usePlaceOrderMutation();

  const availableModes = useMemo<OrderMode[]>(() => {
    if (!listing) {
      return ['rent'];
    }

    if (listing.type === 'both') {
      const modes: OrderMode[] = [];
      if ((listing.availability?.availableForSale || 0) > 0) modes.push('buy');
      if ((listing.availability?.availableForRent || 0) > 0) modes.push('rent');
      return modes.length > 0 ? modes : ['buy', 'rent'];
    }

    return [listing.type];
  }, [listing]);

  const [selectedMode, setSelectedMode] = useState<OrderMode>(orderType === 'buy' ? 'buy' : 'rent');
  const [quantity, setQuantity] = useState(1);
  const [durationUnit, setDurationUnit] = useState<RentalUnit>('day');
  const [durationCount, setDurationCount] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MarketplacePaymentMethod>('escrow_card');
  const [acceptPlatformTerms, setAcceptPlatformTerms] = useState(false);
  const [acceptEscrowTerms, setAcceptEscrowTerms] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    if (!listing) {
      return;
    }

    if (listing.type === 'both') {
      if ((orderType === 'buy' || orderType === 'rent') && availableModes.includes(orderType as OrderMode)) {
        setSelectedMode(orderType as OrderMode);
      } else if (availableModes.length === 1) {
        setSelectedMode(availableModes[0]);
      } else {
        setSelectedMode('rent');
      }
      return;
    }

    setSelectedMode(listing.type === 'buy' ? 'buy' : 'rent');
  }, [availableModes, listing, orderType]);

  const citiesForState = useMemo(() => {
    if (!state) {
      return [];
    }

    return CITY_STATE_MAPPING[state] || [];
  }, [state]);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) {
      return citiesForState;
    }

    return citiesForState.filter((item) => item.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch, citiesForState]);

  const availableQuantity = selectedMode === 'buy'
    ? Number(listing?.availability?.availableForSale || 0)
    : Number(listing?.availability?.availableForRent || 0);

  useEffect(() => {
    if (availableQuantity <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((prev) => Math.min(Math.max(1, prev), availableQuantity));
  }, [availableQuantity]);

  const pricing = useMemo(() => {
    const buyPrice = Number(listing?.price?.buy || 0);
    const rentPrice = listing?.price?.rent;

    if (selectedMode === 'buy') {
      const itemAmount = buyPrice * quantity;
      const serviceFee = Math.round(itemAmount * 0.05);
      return {
        buyPrice,
        rentRateByUnit: 0,
        totalDays: 0,
        discountApplied: 'none' as const,
        itemAmount,
        securityDeposit: 0,
        serviceFee,
        total: itemAmount + serviceFee,
      };
    }

    const totalDays = durationUnit === 'day' ? durationCount : durationUnit === 'week' ? durationCount * 7 : durationCount * 30;
    const dailyRate = Number(rentPrice?.daily || 0);
    const weeklyRate = Number(rentPrice?.weekly || 0);
    const monthlyRate = Number(rentPrice?.monthly || 0);

    let rentRateByUnit = dailyRate;
    let discountApplied: 'none' | 'weekly' | 'monthly' = 'none';

    if (totalDays >= 30 && monthlyRate > 0) {
      rentRateByUnit = monthlyRate / 30;
      discountApplied = 'monthly';
    } else if (totalDays >= 7 && weeklyRate > 0) {
      rentRateByUnit = weeklyRate / 7;
      discountApplied = 'weekly';
    }

    const itemAmount = Math.round(rentRateByUnit * totalDays) * quantity;
    const securityDeposit = Number(listing?.price?.securityDeposit || 0);
    const serviceFee = Math.round(itemAmount * 0.05);

    return {
      buyPrice,
      rentRateByUnit,
      totalDays,
      discountApplied,
      itemAmount,
      securityDeposit,
      serviceFee,
      total: itemAmount + securityDeposit + serviceFee,
    };
  }, [durationCount, durationUnit, listing, quantity, selectedMode]);

  const canSubmit = fullName.trim().length > 1
    && phone.trim().length > 5
    && state.trim().length > 1
    && city.trim().length > 1
    && deliveryAddress.trim().length > 6
    && quantity >= 1
    && quantity <= Math.max(1, availableQuantity)
    && paymentConfirmed
    && acceptPlatformTerms
    && acceptEscrowTerms;

  const handleStateSelect = (selectedState: string) => {
    setState(selectedState);
    setCity('');
    setShowStatePicker(false);
    setCitySearch('');
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityPicker(false);
    setCitySearch('');
  };

  const handlePlaceOrder = async () => {
    if (!listing || !currentUser?.id) {
      return;
    }

    if (!canSubmit) {
      Alert.alert('Complete checkout', 'Please complete all required fields before submitting your request.');
      return;
    }

    try {
      const result = await placeMutation.mutateAsync({
        listingId: listing.id,
        buyerId: currentUser.id,
        mode: selectedMode,
        quantity,
        durationUnit: selectedMode === 'rent' ? durationUnit : null,
        durationCount: selectedMode === 'rent' ? durationCount : null,
        unitPrice: selectedMode === 'buy' ? pricing.buyPrice : pricing.rentRateByUnit,
        itemAmount: pricing.itemAmount,
        securityDeposit: pricing.securityDeposit,
        platformFee: pricing.serviceFee,
        totalDue: pricing.total,
        paymentMethod,
        paymentConfirmed,
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        deliveryAddress: deliveryAddress.trim(),
        specialInstructions: specialInstructions.trim(),
      });

      setPlacedOrderId(result?.id || null);
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Failed to place order');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.blue} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={48} color={colors.neutral.mediumGray} />
        <Text style={styles.errorText}>Listing not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (placedOrderId) {
    return (
      <View style={styles.successScreen}>
        <LinearGradient colors={[colors.primary.blue, colors.secondary.darkSlate]} style={styles.successCard}>
          <MaterialIcons name="check-circle" size={72} color={colors.neutral.white} />
          <Text style={styles.successTitle}>Request Sent</Text>
          <Text style={styles.successSub}>
            Your {selectedMode === 'rent' ? 'rental' : 'purchase'} request has been sent to the seller.
          </Text>
          <Text style={styles.successOrderId}>Order #{placedOrderId.slice(0, 8)}</Text>
        </LinearGradient>

        <Pressable style={styles.successPrimaryBtn} onPress={() => router.push('/profile/my-bookings' as any)}>
          <Text style={styles.successPrimaryBtnText}>View My Orders</Text>
        </Pressable>

        <Pressable style={styles.successSecondaryBtn} onPress={() => router.push('/(tabs)' as any)}>
          <Text style={styles.successSecondaryBtnText}>Continue Browsing</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary.blue, colors.secondary.darkSlate]} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.neutral.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{selectedMode === 'rent' ? 'Rent Item' : 'Buy Item'}</Text>
          <Text style={styles.headerSubtitle}>Same checkout flow across web and mobile</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        <View style={styles.listingSummary}>
          {listing.images?.[0] ? <Image source={{ uri: listing.images[0] }} style={styles.listingImg} /> : null}
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
            <Text style={styles.listingMeta}>{listing.location?.city}, {listing.location?.area}</Text>
            <View style={styles.modeRow}>
              {availableModes.length > 1 ? (
                <View style={styles.segmentedControl}>
                  <Pressable
                    style={[styles.segment, selectedMode === 'buy' && styles.segmentActive, !availableModes.includes('buy') && styles.segmentDisabled]}
                    onPress={() => setSelectedMode('buy')}
                    disabled={!availableModes.includes('buy')}
                  >
                    <Text style={[styles.segmentText, selectedMode === 'buy' && styles.segmentTextActive]}>Buy</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segment, selectedMode === 'rent' && styles.segmentActive, !availableModes.includes('rent') && styles.segmentDisabled]}
                    onPress={() => setSelectedMode('rent')}
                    disabled={!availableModes.includes('rent')}
                  >
                    <Text style={[styles.segmentText, selectedMode === 'rent' && styles.segmentTextActive]}>Rent</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.lockedModePill}>
                  <Text style={styles.lockedModeText}>{selectedMode === 'rent' ? 'Rent only' : 'Buy only'}</Text>
                </View>
              )}
              <View style={[styles.stockPill, availableQuantity > 0 ? styles.stockPillOk : styles.stockPillOut]}>
                <Text style={styles.stockPillText}>{availableQuantity} available</Text>
              </View>
            </View>
          </View>
        </View>

        {selectedMode === 'rent' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Period</Text>
            <View style={styles.modeRow}>
              {(['day', 'week', 'month'] as const).map((unit) => (
                <Pressable
                  key={unit}
                  style={[styles.unitChip, durationUnit === unit && styles.unitChipActive]}
                  onPress={() => setDurationUnit(unit)}
                >
                  <Text style={[styles.unitChipText, durationUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.counterRow}>
              <Pressable style={styles.counterBtn} onPress={() => setDurationCount((prev) => Math.max(1, prev - 1))}>
                <MaterialIcons name="remove" size={20} color={colors.primary.blue} />
              </Pressable>
              <View style={styles.counterValueBox}>
                <Text style={styles.counterValue}>{durationCount}</Text>
                <Text style={styles.counterLabel}>{durationUnit}(s)</Text>
              </View>
              <Pressable style={styles.counterBtn} onPress={() => setDurationCount((prev) => prev + 1)}>
                <MaterialIcons name="add" size={20} color={colors.primary.blue} />
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              {pricing.totalDays} total days, {pricing.discountApplied === 'none' ? 'no discount applied' : `${pricing.discountApplied} discount applied`}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.counterRow}>
            <Pressable
              style={[styles.counterBtn, quantity <= 1 && styles.counterBtnDisabled]}
              onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
            >
              <MaterialIcons name="remove" size={20} color={quantity <= 1 ? colors.neutral.mediumGray : colors.primary.blue} />
            </Pressable>
            <View style={styles.counterValueBox}>
              <Text style={styles.counterValue}>{quantity}</Text>
              <Text style={styles.counterLabel}>unit{quantity > 1 ? 's' : ''}</Text>
            </View>
            <Pressable
              style={[styles.counterBtn, quantity >= availableQuantity && styles.counterBtnDisabled]}
              onPress={() => setQuantity((prev) => Math.min(Math.max(1, prev + 1), Math.max(1, availableQuantity)))}
              disabled={quantity >= availableQuantity}
            >
              <MaterialIcons name="add" size={20} color={quantity >= availableQuantity ? colors.neutral.mediumGray : colors.primary.blue} />
            </Pressable>
          </View>
          <Text style={styles.helperText}>You can select up to {availableQuantity} units.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Delivery</Text>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>State / Province</Text>
              <Pressable style={[styles.pickerInput, state && styles.pickerInputFilled]} onPress={() => setShowStatePicker(true)}>
                <Text style={[styles.pickerText, !state && styles.placeholder]}>{state || 'Select State or Province'}</Text>
                <MaterialIcons name="expand-more" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>City</Text>
              <Pressable
                style={[
                  styles.pickerInput,
                  city && styles.pickerInputFilled,
                  !state && styles.pickerInputDisabled,
                ]}
                onPress={() => state && setShowCityPicker(true)}
                disabled={!state}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !city && styles.placeholder,
                    !state && styles.placeholderDisabled,
                  ]}
                >
                  {city || (state ? 'Select City' : 'Select State First')}
                </Text>
                <MaterialIcons name="expand-more" size={20} color={state ? colors.text.secondary : `${colors.text.secondary}50`} />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <Field label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="03xx-xxxxxxx" keyboardType="phone-pad" />
          </View>

          <Field
            label="Delivery / Handover Address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter your complete address"
            multiline
            lines={3}
          />
          <Field
            label="Special Instructions"
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Optional"
            multiline
            lines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            {[
              { value: 'escrow_card' as const, label: 'Escrow Card', sub: 'Recommended' },
              { value: 'bank_transfer' as const, label: 'Bank Transfer', sub: 'Manual verification' },
              { value: 'wallet' as const, label: 'Wallet', sub: 'Fast checkout' },
            ].map((method) => (
              <Pressable
                key={method.value}
                style={[styles.paymentCard, paymentMethod === method.value && styles.paymentCardActive]}
                onPress={() => setPaymentMethod(method.value)}
              >
                <Text style={[styles.paymentLabel, paymentMethod === method.value && styles.paymentLabelActive]}>{method.label}</Text>
                <Text style={styles.paymentSub}>{method.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Verification</Text>
          <Text style={styles.helperText}>Confirm payment before placing the request, just like the web checkout.</Text>
          <Pressable
            onPress={() => setPaymentConfirmed((prev) => !prev)}
            style={[styles.verifyBtn, paymentConfirmed && styles.verifyBtnActive]}
          >
            <MaterialIcons name={paymentConfirmed ? 'verified' : 'credit-card'} size={18} color={paymentConfirmed ? colors.neutral.white : colors.primary.blue} />
            <Text style={[styles.verifyBtnText, paymentConfirmed && styles.verifyBtnTextActive]}>
              {paymentConfirmed ? 'Payment Confirmed' : 'Mark Payment Confirmed'}
            </Text>
          </Pressable>
          <View style={styles.checkboxList}>
            <CheckRow
              checked={acceptPlatformTerms}
              onPress={() => setAcceptPlatformTerms((prev) => !prev)}
              text="I accept RentVerse terms, cancellation rules, and store policies."
            />
            <CheckRow
              checked={acceptEscrowTerms}
              onPress={() => setAcceptEscrowTerms((prev) => !prev)}
              text="I understand payment is handled through escrow and released after verification."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <SummaryRow label="Mode" value={selectedMode === 'rent' ? 'Rental' : 'Purchase'} />
          <SummaryRow label="Units" value={String(quantity)} />
          {selectedMode === 'rent' ? <SummaryRow label="Duration" value={`${durationCount} ${durationUnit}(s)`} /> : null}
          <SummaryRow label="Item amount" value={fmt(pricing.itemAmount)} />
          {selectedMode === 'rent' && pricing.discountApplied !== 'none' ? (
            <View style={styles.discountBanner}>
              <MaterialIcons name="local-offer" size={16} color={colors.primary.darkBlue} />
              <Text style={styles.discountBannerText}>{pricing.discountApplied === 'weekly' ? 'Weekly discount applied' : 'Monthly discount applied'}</Text>
            </View>
          ) : null}
          {selectedMode === 'rent' ? <SummaryRow label="Security deposit" value={fmt(pricing.securityDeposit)} /> : null}
          <SummaryRow label="Platform fee (5%)" value={fmt(pricing.serviceFee)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(pricing.total)}</Text>
          </View>
        </View>

        <View style={styles.noticeBox}>
          <MaterialIcons name="info" size={18} color={colors.primary.blue} />
          <Text style={styles.noticeText}>This request will be sent to the seller for approval and will appear in your orders after submission.</Text>
        </View>

        <Pressable style={[styles.placeBtn, placeMutation.isPending && styles.placeBtnLoading]} onPress={handlePlaceOrder} disabled={placeMutation.isPending}>
          {placeMutation.isPending ? <ActivityIndicator color={colors.neutral.white} size="small" /> : <Text style={styles.placeBtnText}>{selectedMode === 'rent' ? 'Send Rental Request' : 'Send Buy Request'}</Text>}
        </Pressable>
      </ScrollView>

      <Modal
        visible={showStatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStatePicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <Pressable onPress={() => setShowStatePicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            <FlatList
              data={STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.optionItem, state === item && styles.optionItemSelected]}
                  onPress={() => handleStateSelect(item)}
                >
                  <Text style={[styles.optionText, state === item && styles.optionTextSelected]}>{item}</Text>
                  {state === item && <MaterialIcons name="check" size={20} color={colors.primary.blue} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCityPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <Pressable onPress={() => setShowCityPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor={colors.text.secondary}
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.optionItem, city === item && styles.optionItemSelected]}
                  onPress={() => handleCitySelect(item)}
                >
                  <Text style={[styles.optionText, city === item && styles.optionTextSelected]}>{item}</Text>
                  {city === item && <MaterialIcons name="check" size={20} color={colors.primary.blue} />}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No cities found</Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  lines,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
  lines?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { minHeight: (lines || 3) * 22 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={lines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function CheckRow({ checked, onPress, text }: { checked: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
        {checked ? <MaterialIcons name="check" size={14} color={colors.neutral.white} /> : null}
      </View>
      <Text style={styles.checkText}>{text}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary, gap: spacing.md },
  errorText: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
  backLink: { backgroundColor: colors.primary.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.md },
  backLinkText: { color: colors.neutral.white, fontWeight: '700' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerTitle: { color: colors.neutral.white, fontSize: 20, fontWeight: '900' },
  headerSubtitle: { color: '#dbeafe', fontSize: 12, marginTop: 2 },

  scroll: { flex: 1 },
  scrollPad: { padding: 16, paddingBottom: 48 },

  listingSummary: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.neutral.white,
    borderRadius: 22,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImg: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.neutral.veryLightGray, resizeMode: 'cover' },
  listingInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  listingTitle: { fontSize: 16, fontWeight: '900', color: colors.text.primary },
  listingMeta: { fontSize: 13, color: colors.text.secondary },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  segmentedControl: { flexDirection: 'row', backgroundColor: colors.primary[50], borderRadius: 999, padding: 4, gap: 4 },
  segment: { minWidth: 72, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary.blue },
  segmentDisabled: { opacity: 0.4 },
  segmentText: { color: colors.primary.blue, fontWeight: '800' },
  segmentTextActive: { color: colors.neutral.white },
  lockedModePill: { backgroundColor: colors.secondary[100], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  lockedModeText: { color: colors.secondary.darkSlate, fontWeight: '800' },
  stockPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  stockPillOk: { backgroundColor: '#ecfdf5' },
  stockPillOut: { backgroundColor: '#fef2f2' },
  stockPillText: { color: '#065f46', fontWeight: '800', fontSize: 12 },

  section: { backgroundColor: colors.neutral.white, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border.light },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text.primary, marginBottom: 12 },
  helperText: { marginTop: 8, fontSize: 12, color: colors.text.secondary, lineHeight: 18 },

  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.neutral.veryLightGray, borderWidth: 1, borderColor: colors.border.light },
  unitChipActive: { backgroundColor: colors.primary[50], borderColor: colors.primary.blue },
  unitChipText: { color: colors.secondary.darkSlate, fontWeight: '700', textTransform: 'capitalize' },
  unitChipTextActive: { color: colors.primary.blue },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  counterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary[200] },
  counterBtnDisabled: { backgroundColor: colors.neutral.veryLightGray, borderColor: colors.border.light },
  counterValueBox: { alignItems: 'center', minWidth: 72 },
  counterValue: { fontSize: 32, fontWeight: '900', color: colors.text.primary },
  counterLabel: { fontSize: 12, color: colors.text.secondary, fontWeight: '700' },

  fieldGrid: { gap: 12, marginBottom: 12 },
  fieldWrap: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: colors.secondary.darkSlate, fontWeight: '800' },
  fieldInput: { backgroundColor: colors.neutral.veryLightGray, borderRadius: 14, borderWidth: 1, borderColor: colors.border.light, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text.primary, fontWeight: '600' },
  pickerInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.neutral.veryLightGray, borderRadius: 14, borderWidth: 1, borderColor: colors.border.light, paddingHorizontal: 14, paddingVertical: 12 },
  pickerInputFilled: { borderColor: colors.primary.blue, backgroundColor: colors.primary[50] },
  pickerInputDisabled: { opacity: 0.6 },
  pickerText: { fontSize: 14, color: colors.text.primary, fontWeight: '600', flex: 1, paddingRight: 12 },
  placeholder: { color: colors.text.secondary, fontWeight: '500' },
  placeholderDisabled: { color: colors.text.muted },

  paymentGrid: { gap: 10 },
  paymentCard: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 18, padding: 14, backgroundColor: colors.neutral.white },
  paymentCardActive: { borderColor: colors.primary.blue, backgroundColor: colors.primary[50] },
  paymentLabel: { fontSize: 14, fontWeight: '900', color: colors.text.primary },
  paymentLabelActive: { color: colors.primary.blue },
  paymentSub: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },

  verifyBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.primary.blue, paddingVertical: 14, backgroundColor: colors.primary[50] },
  verifyBtnActive: { backgroundColor: colors.primary.blue },
  verifyBtnText: { color: colors.primary.blue, fontWeight: '900' },
  verifyBtnTextActive: { color: colors.neutral.white },
  checkboxList: { gap: 10, marginTop: 12 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium, marginTop: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.white },
  checkBoxActive: { backgroundColor: colors.primary.blue, borderColor: colors.primary.blue },
  checkText: { flex: 1, fontSize: 13, color: colors.secondary.darkSlate, lineHeight: 19 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  summaryLabel: { color: colors.text.secondary, fontSize: 13 },
  summaryValue: { color: colors.text.primary, fontSize: 13, fontWeight: '800' },
  discountBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 6, marginBottom: 4 },
  discountBannerText: { color: '#047857', fontWeight: '800', fontSize: 12 },
  totalRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 12 },
  totalLabel: { color: colors.text.primary, fontSize: 16, fontWeight: '900' },
  totalValue: { color: colors.primary.blue, fontSize: 22, fontWeight: '900' },

  noticeBox: { flexDirection: 'row', gap: 10, backgroundColor: colors.primary[50], borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.primary[100] },
  noticeText: { flex: 1, fontSize: 13, color: colors.secondary.darkSlate, lineHeight: 19 },

  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary.blue, borderRadius: 18, paddingVertical: 17 },
  placeBtnLoading: { backgroundColor: colors.primary[400] },
  placeBtnText: { color: colors.neutral.white, fontWeight: '900', fontSize: 16 },

  successScreen: { flex: 1, backgroundColor: colors.background.primary, padding: 16, justifyContent: 'center' },
  successCard: { borderRadius: 28, padding: 24, alignItems: 'center', gap: 10 },
  successTitle: { fontSize: 28, fontWeight: '900', color: colors.neutral.white, textAlign: 'center' },
  successSub: { fontSize: 14, color: '#dbeafe', textAlign: 'center', lineHeight: 21 },
  successOrderId: { color: colors.neutral.white, fontSize: 12, fontWeight: '800', marginTop: 4, opacity: 0.95 },
  successPrimaryBtn: { backgroundColor: colors.primary.blue, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  successPrimaryBtnText: { color: colors.neutral.white, fontWeight: '900', fontSize: 15 },
  successSecondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  successSecondaryBtnText: { color: colors.primary.blue, fontWeight: '900' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral.veryLightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
  },
  optionItemSelected: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.primary.blue,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
});
