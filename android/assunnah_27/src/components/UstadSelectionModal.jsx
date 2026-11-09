import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  useColorScheme,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  getFavoriteUstadIds,
  saveFavoriteUstadIds,
  searchUstads,
} from '../services/favorite-ustad-service';

export default function UstadSelectionModal({ visible, onClose, onSave }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব');
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const categories = ['সব', 'মুহাদ্দিসিন', 'কিতাব বিভাগ', 'হিফজ বিভাগ'];

  const loadInitialSelected = async () => {
    const ids = await getFavoriteUstadIds();
    setSelectedIds(ids || []);
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        loadInitialSelected();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const filteredUstads = useMemo(() => {
    return searchUstads(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveFavoriteUstadIds(selectedIds);
    setSaving(false);
    if (onSave) {
      onSave(selectedIds);
    }
    onClose();
  };

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('তথ্য নেই', 'এই উস্তাদের যোগাযোগের নম্বর সংরক্ষিত নেই।');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('ত্রুটি', 'কল শুরু করা যায়নি।');
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>প্রিয় উস্তাদ নির্বাচন করুন</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedIds.length} জন উস্তাদ নির্বাচিত
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="উস্তাদের নাম বা বিষয় খুঁজুন..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryRow}>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    active && styles.categoryPillActive,
                    {
                      backgroundColor: active ? (isDark ? '#2563EB' : '#2563EB') : isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: active ? '#2563EB' : isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, { color: active ? '#FFFFFF' : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ustad List */}
          <FlatList
            data={filteredUstads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.ustadItemCard,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isSelected ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => toggleSelect(item.id)}
                >
                  <View style={styles.cardLeft}>
                    <View style={[styles.avatarBox, { backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : isDark ? '#0F172A' : '#EFF6FF' }]}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={isSelected ? '#10B981' : '#2563EB'}
                      />
                    </View>
                    <View style={styles.nameArea}>
                      <Text style={[styles.ustadName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.ustadTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {item.address ? (
                          <View style={styles.metaBadge}>
                            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.address}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.catBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                          <Text style={styles.catBadgeText}>{item.category}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    {item.phone ? (
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(item.phone);
                        }}
                      >
                        <Ionicons name="call" size={14} color="#059669" />
                      </TouchableOpacity>
                    ) : null}
                    <View
                      style={[
                        styles.starBtn,
                        {
                          backgroundColor: isSelected ? '#10B981' : isDark ? '#334155' : '#F1F5F9',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'star' : 'star-outline'}
                        size={16}
                        color={isSelected ? '#FFFFFF' : colors.textMuted}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  কোনো উস্তাদ পাওয়া যায়নি
                </Text>
              </View>
            }
          />

          {/* Footer Save Button */}
          <View style={[styles.footer, { borderTopColor: isDark ? '#1E293B' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                সংরক্ষণ করুন ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillActive: {},
  categoryText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  ustadItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameArea: {
    flex: 1,
  },
  ustadName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  ustadTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
